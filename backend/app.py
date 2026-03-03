"""Homelab Dashboard — Flask backend API proxy with SQLite caching."""
import os
import time
import logging
from datetime import datetime, timezone

import requests
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

import cache
import signals as sig_calc

load_dotenv()

app = Flask(__name__)
CORS(
    app,
    origins="*",
    allow_headers="*",
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_private_network=True,   # Handles Chrome/Firefox Private Network Access (PNA).
                                   # Tailscale 100.x.x.x IPs are treated as private by browsers,
                                   # blocking requests from public HTTPS (GitHub Pages) without this.
)

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

# API keys (may be None if not set)
FINNHUB_KEY = os.getenv("FINNHUB_API_KEY", "")
ALPHA_VANTAGE_KEY = os.getenv("ALPHA_VANTAGE_API_KEY", "")
GNEWS_KEY = os.getenv("GNEWS_API_KEY", "")

# TTLs in seconds
TTL_STOCKS = 5 * 60          # 5 min
TTL_SIGNALS = 24 * 60 * 60   # 24 hours
TTL_WEATHER = 30 * 60        # 30 min
TTL_NEWS = 3 * 60 * 60       # 3 hours


# ─── Utility ───────────────────────────────────────────────────────────────────

def _fetch_json(url: str, params: dict = None, timeout: int = 10) -> dict | None:
    try:
        resp = requests.get(url, params=params, timeout=timeout)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        log.warning("HTTP fetch failed: %s — %s", url, e)
        return None


# ─── Stocks ────────────────────────────────────────────────────────────────────

@app.route("/api/stocks/quotes")
def stock_quotes():
    symbols_param = request.args.get("symbols", "AAPL,MSFT,GOOGL,AMZN,NVDA,TSLA,META")
    symbols = [s.strip().upper() for s in symbols_param.split(",") if s.strip()]

    results = []
    for symbol in symbols:
        cache_key = f"quote:{symbol}"
        data = cache.get(cache_key)
        if data is None:
            if not FINNHUB_KEY:
                data = _mock_quote(symbol)
            else:
                raw = _fetch_json(
                    "https://finnhub.io/api/v1/quote",
                    params={"symbol": symbol, "token": FINNHUB_KEY},
                )
                if raw and raw.get("c"):
                    data = {
                        "symbol": symbol,
                        "price": raw["c"],
                        "change": raw["d"],
                        "change_pct": raw["dp"],
                        "high": raw["h"],
                        "low": raw["l"],
                        "open": raw["o"],
                        "prev_close": raw["pc"],
                    }
                else:
                    data = _mock_quote(symbol)
            cache.set(cache_key, data, TTL_STOCKS)
        results.append(data)

    return jsonify(results)


def _mock_quote(symbol: str) -> dict:
    """Return deterministic mock data when no API key is configured."""
    import hashlib
    seed = int(hashlib.md5(symbol.encode()).hexdigest(), 16) % 10000
    price = 100 + seed / 100
    change = (seed % 20 - 10) / 10
    return {
        "symbol": symbol,
        "price": round(price, 2),
        "change": round(change, 2),
        "change_pct": round(change / price * 100, 2),
        "high": round(price * 1.02, 2),
        "low": round(price * 0.98, 2),
        "open": round(price - change, 2),
        "prev_close": round(price - change, 2),
        "mock": True,
    }


# ─── Watchlist ─────────────────────────────────────────────────────────────────

@app.route("/api/stocks/watchlist", methods=["GET", "POST", "DELETE"])
def watchlist():
    if request.method == "GET":
        symbols = cache.get_watchlist()
        if not symbols:
            symbols = ["AAPL", "NVDA", "MSFT"]
            for s in symbols:
                cache.add_to_watchlist(s)
        # Fetch quotes for watchlist symbols
        quotes = []
        for symbol in symbols:
            cache_key = f"quote:{symbol}"
            data = cache.get(cache_key)
            if data is None:
                if not FINNHUB_KEY:
                    data = _mock_quote(symbol)
                else:
                    raw = _fetch_json(
                        "https://finnhub.io/api/v1/quote",
                        params={"symbol": symbol, "token": FINNHUB_KEY},
                    )
                    profile = _fetch_json(
                        "https://finnhub.io/api/v1/stock/profile2",
                        params={"symbol": symbol, "token": FINNHUB_KEY},
                    ) or {}
                    if raw and raw.get("c"):
                        data = {
                            "symbol": symbol,
                            "name": profile.get("name", symbol),
                            "price": raw["c"],
                            "change": raw["d"],
                            "change_pct": raw["dp"],
                            "high": raw["h"],
                            "low": raw["l"],
                            "open": raw["o"],
                            "prev_close": raw["pc"],
                            "volume": raw.get("v", 0),
                        }
                    else:
                        data = _mock_quote(symbol)
                cache.set(cache_key, data, TTL_STOCKS)
            quotes.append(data)
        return jsonify({"symbols": symbols, "quotes": quotes})

    elif request.method == "POST":
        body = request.get_json(silent=True) or {}
        symbol = body.get("symbol", "").strip().upper()
        if not symbol:
            return jsonify({"error": "symbol required"}), 400
        cache.add_to_watchlist(symbol)
        return jsonify({"symbols": cache.get_watchlist()})

    elif request.method == "DELETE":
        body = request.get_json(silent=True) or {}
        symbol = body.get("symbol", "").strip().upper()
        if not symbol:
            return jsonify({"error": "symbol required"}), 400
        cache.remove_from_watchlist(symbol)
        return jsonify({"symbols": cache.get_watchlist()})


# ─── Signals ───────────────────────────────────────────────────────────────────

@app.route("/api/stocks/signals")
def stock_signals():
    symbols = cache.get_watchlist()
    if not symbols:
        symbols = ["AAPL", "NVDA", "MSFT"]

    cache_key = "signals:all"
    cached = cache.get(cache_key)
    if cached is not None:
        return jsonify(cached)

    results = []
    for symbol in symbols:
        closes, volumes = _fetch_historical(symbol)
        symbol_signals = sig_calc.analyze_signals(symbol, closes, volumes)
        results.append({"symbol": symbol, "signals": symbol_signals})

    cache.set(cache_key, results, TTL_SIGNALS)
    return jsonify(results)


def _fetch_historical(symbol: str) -> tuple[list, list]:
    """Return (closes, volumes) lists, newest last."""
    cache_key = f"hist:{symbol}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached["closes"], cached["volumes"]

    if not ALPHA_VANTAGE_KEY:
        # Mock 60 days of synthetic data
        import math
        closes = [150 + 10 * math.sin(i / 5) for i in range(60)]
        volumes = [1_000_000 + 100_000 * (i % 5) for i in range(60)]
        cache.set(cache_key, {"closes": closes, "volumes": volumes}, TTL_SIGNALS)
        return closes, volumes

    raw = _fetch_json(
        "https://www.alphavantage.co/query",
        params={
            "function": "TIME_SERIES_DAILY",
            "symbol": symbol,
            "outputsize": "compact",
            "apikey": ALPHA_VANTAGE_KEY,
        },
    )
    if not raw or "Time Series (Daily)" not in raw:
        log.warning("Alpha Vantage returned no data for %s", symbol)
        return [], []

    ts = raw["Time Series (Daily)"]
    dates = sorted(ts.keys())
    closes = [float(ts[d]["4. close"]) for d in dates]
    volumes = [float(ts[d]["5. volume"]) for d in dates]
    cache.set(cache_key, {"closes": closes, "volumes": volumes}, TTL_SIGNALS)
    return closes, volumes


# ─── Weather ───────────────────────────────────────────────────────────────────

@app.route("/api/weather")
def weather():
    lat = request.args.get("lat", "43.0389")   # Milwaukee, WI default
    lon = request.args.get("lon", "-87.9065")

    cache_key = f"weather:{lat}:{lon}"
    data = cache.get(cache_key)
    if data is not None:
        return jsonify(data)

    # Current + hourly for cloud cover + daily forecast
    raw = _fetch_json(
        "https://api.open-meteo.com/v1/forecast",
        params={
            "latitude": lat,
            "longitude": lon,
            "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,cloud_cover",
            "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum",
            "hourly": "cloud_cover",
            "temperature_unit": "fahrenheit",
            "wind_speed_unit": "mph",
            "precipitation_unit": "inch",
            "timezone": "auto",
            "forecast_days": 4,
        },
    )

    if not raw:
        return jsonify({"error": "Weather data unavailable"}), 503

    current = raw.get("current", {})
    daily = raw.get("daily", {})
    hourly = raw.get("hourly", {})

    # Current cloud cover: find closest hourly value
    hourly_times = hourly.get("time", [])
    hourly_cloud = hourly.get("cloud_cover", [])
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:00")
    cloud_cover = 50  # fallback
    for i, t in enumerate(hourly_times):
        if t >= now_str:
            cloud_cover = hourly_cloud[i] if i < len(hourly_cloud) else 50
            break

    data = {
        "current": {
            "temperature": current.get("temperature_2m"),
            "humidity": current.get("relative_humidity_2m"),
            "wind_speed": current.get("wind_speed_10m"),
            "weather_code": current.get("weather_code"),
            "cloud_cover": current.get("cloud_cover", cloud_cover),
            "condition": _wmo_description(current.get("weather_code", 0)),
        },
        "forecast": [
            {
                "date": daily["time"][i],
                "weather_code": daily["weather_code"][i],
                "condition": _wmo_description(daily["weather_code"][i]),
                "temp_max": daily["temperature_2m_max"][i],
                "temp_min": daily["temperature_2m_min"][i],
                "precipitation": daily["precipitation_sum"][i],
            }
            for i in range(min(4, len(daily.get("time", []))))
        ],
        "cloud_cover": cloud_cover,
    }

    cache.set(cache_key, data, TTL_WEATHER)
    return jsonify(data)


def _wmo_description(code: int) -> str:
    """Map WMO weather code to human-readable string."""
    WMO = {
        0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
        45: "Foggy", 48: "Icy fog",
        51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
        61: "Slight rain", 63: "Rain", 65: "Heavy rain",
        71: "Slight snow", 73: "Snow", 75: "Heavy snow",
        77: "Snow grains",
        80: "Slight showers", 81: "Showers", 82: "Violent showers",
        85: "Snow showers", 86: "Heavy snow showers",
        95: "Thunderstorm", 96: "Thunderstorm w/ hail", 99: "Thunderstorm w/ heavy hail",
    }
    return WMO.get(code, f"Code {code}")


# ─── News ──────────────────────────────────────────────────────────────────────

@app.route("/api/news")
def news():
    cache_key = "news:ai"
    data = cache.get(cache_key)
    if data is not None:
        return jsonify(data)

    articles = _fetch_gnews() or _fetch_hackernews()
    data = {"articles": articles, "source": "gnews" if GNEWS_KEY else "hackernews"}
    cache.set(cache_key, data, TTL_NEWS)
    return jsonify(data)


def _fetch_gnews() -> list | None:
    if not GNEWS_KEY:
        return None
    raw = _fetch_json(
        "https://gnews.io/api/v4/search",
        params={
            "q": "artificial intelligence",
            "lang": "en",
            "max": 10,
            "sortby": "publishedAt",
            "token": GNEWS_KEY,
        },
    )
    if not raw or "articles" not in raw:
        return None
    articles = []
    for a in raw["articles"][:10]:
        articles.append({
            "title": a.get("title", ""),
            "url": a.get("url", ""),
            "source": a.get("source", {}).get("name", ""),
            "published_at": a.get("publishedAt", ""),
        })
    return articles


AI_KEYWORDS = {
    "ai", "ml", "llm", "gpt", "machine learning", "deep learning", "neural",
    "openai", "anthropic", "gemini", "mistral", "llama", "transformer",
    "diffusion", "generative", "chatbot", "artificial intelligence",
    "language model", "reinforcement", "embedding", "vector db", "rag",
}


def _fetch_hackernews() -> list:
    raw = _fetch_json("https://hacker-news.firebaseio.com/v0/topstories.json")
    if not raw:
        return []

    articles = []
    for story_id in raw[:100]:
        if len(articles) >= 10:
            break
        story = _fetch_json(f"https://hacker-news.firebaseio.com/v0/item/{story_id}.json")
        if not story:
            continue
        title = (story.get("title") or "").lower()
        if any(kw in title for kw in AI_KEYWORDS):
            articles.append({
                "title": story.get("title", ""),
                "url": story.get("url") or f"https://news.ycombinator.com/item?id={story_id}",
                "source": "Hacker News",
                "published_at": datetime.fromtimestamp(
                    story.get("time", 0), tz=timezone.utc
                ).isoformat(),
                "score": story.get("score", 0),
            })
    return articles


# ─── Layout ────────────────────────────────────────────────────────────────────

@app.route("/api/layout", methods=["GET", "PUT"])
def layout():
    if request.method == "GET":
        data = cache.get_layout()
        if data is None:
            return jsonify({"layout": None})
        return jsonify({"layout": data})

    body = request.get_json(silent=True) or {}
    layout_data = body.get("layout")
    if layout_data is None:
        return jsonify({"error": "layout required"}), 400
    cache.save_layout(layout_data)
    return jsonify({"ok": True})


# ─── Health ────────────────────────────────────────────────────────────────────

@app.route("/api/health")
def health():
    return jsonify({
        "status": "ok",
        "time": datetime.now(timezone.utc).isoformat(),
        "finnhub": bool(FINNHUB_KEY),
        "alpha_vantage": bool(ALPHA_VANTAGE_KEY),
        "gnews": bool(GNEWS_KEY),
    })


# ─── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    cache.init_db()
    cert = os.getenv("CERT_FILE")
    key = os.getenv("KEY_FILE")

    if cert and key:
        # Starts in HTTPS mode
        app.run(host="0.0.0.0", port=5001, ssl_context=(cert, key))
    else:
        # Falls back to HTTP if no certs found (for local testing)
        app.run(host="0.0.0.0", port=5001)
