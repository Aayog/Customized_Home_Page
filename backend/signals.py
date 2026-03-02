"""RSI and Bollinger Band calculations."""
import numpy as np


def compute_rsi(prices: list[float], period: int = 14) -> float | None:
    """Return the most recent RSI value for the given close prices."""
    if len(prices) < period + 1:
        return None
    prices = np.array(prices, dtype=float)
    deltas = np.diff(prices)
    gains = np.where(deltas > 0, deltas, 0.0)
    losses = np.where(deltas < 0, -deltas, 0.0)

    avg_gain = np.mean(gains[:period])
    avg_loss = np.mean(losses[:period])

    for i in range(period, len(deltas)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period

    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return round(100 - (100 / (1 + rs)), 2)


def compute_bollinger(prices: list[float], period: int = 20, num_std: float = 2.0):
    """Return (upper, middle, lower) Bollinger Bands for the most recent price."""
    if len(prices) < period:
        return None, None, None
    window = np.array(prices[-period:], dtype=float)
    middle = float(np.mean(window))
    std = float(np.std(window, ddof=1))
    upper = middle + num_std * std
    lower = middle - num_std * std
    return round(upper, 4), round(middle, 4), round(lower, 4)


def analyze_signals(symbol: str, closes: list[float], volumes: list[float]) -> list[dict]:
    """Return a list of signal dicts for the given symbol."""
    signals = []
    if not closes or len(closes) < 2:
        return signals

    rsi = compute_rsi(closes)
    upper_bb, middle_bb, lower_bb = compute_bollinger(closes)
    current_price = closes[-1]
    prev_price = closes[-2]
    current_volume = volumes[-1] if volumes else None
    avg_volume = float(np.mean(volumes[-20:])) if len(volumes) >= 2 else None

    if rsi is not None:
        if rsi < 30:
            signals.append({
                "type": "OVERSOLD",
                "label": "OVERSOLD",
                "color": "yellow",
                "detail": f"RSI {rsi:.1f} — potentially oversold",
            })
        elif rsi > 70:
            signals.append({
                "type": "OVERBOUGHT",
                "label": "OVERBOUGHT",
                "color": "red",
                "detail": f"RSI {rsi:.1f} — potentially overbought",
            })

    if upper_bb is not None and current_price > upper_bb:
        signals.append({
            "type": "OVEREXTENDED",
            "label": "OVEREXTENDED",
            "color": "red",
            "detail": f"Price ${current_price:.2f} above upper BB ${upper_bb:.2f}",
        })

    if prev_price > 0:
        pct_change = (current_price - prev_price) / prev_price * 100
        high_volume = (
            current_volume is not None
            and avg_volume is not None
            and avg_volume > 0
            and current_volume > avg_volume * 1.5
        )
        if pct_change < -5 and high_volume:
            signals.append({
                "type": "DIP_BUY",
                "label": "DIP BUY?",
                "color": "green",
                "detail": f"Dropped {pct_change:.1f}% on high volume",
            })

    return signals
