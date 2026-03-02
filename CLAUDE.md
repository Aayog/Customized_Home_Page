'PROJECTBRIEF'
# Homelab Dashboard

## Project Overview
A self-hosted browser homepage/dashboard with draggable widget cards.
Built with React (Vite) frontend + Python Flask backend API proxy with caching.

## Tech Stack
- Frontend: React 18+ with Vite, react-grid-layout for draggable/resizable cards
- Backend: Python Flask, SQLite for caching, runs on port 5001
- Styling: Tailwind CSS (via CDN is fine)
- No Docker required - just run both directly

## Widget Cards Required

### 1. Stock Highlights Card
- Shows a configurable list of stock tickers (default: AAPL, MSFT, GOOGL, AMZN, NVDA, TSLA, META)
- Current price, daily change %, color coded green/red
- Data from Finnhub API (free tier, 60 calls/min)
- Refresh every 5 minutes during market hours

### 2. Watchlist Card
- User-configurable watchlist (add/remove tickers via UI)
- More detail than highlights: price, change %, 52-week range, volume
- Mini sparkline or bar showing recent trend
- Data from Finnhub

### 3. Alert/Signal Card
- Analyzes watchlist stocks for buy/sell signals
- Signals to detect:
  - RSI below 30 (oversold / potential buy on dip)
  - RSI above 70 (overbought / potential sell)
  - Price dropped >5% on high volume (dip opportunity for solid companies)
  - Price above upper Bollinger Band (overextended, may pull back)
- Use Alpha Vantage for historical daily data (25 calls/day free)
- Compute RSI and Bollinger Bands in Python backend
- Display as colored badges: green "DIP BUY?", red "OVEREXTENDED", yellow "OVERSOLD"
- Refresh once daily after market close (to conserve API calls)
- Show disclaimer: "Not financial advice"

### 4. Weather Card
- Current conditions for user's configured location (default: Milwaukee, WI)
- Temperature, conditions, humidity, wind
- 3-day forecast
- Uses Open-Meteo API (free, no key needed)
- Refresh every 30 minutes

### 5. Astrophotography Conditions Card
- Cloud cover percentage (from Open-Meteo)
- Moon phase and illumination % (computed via suncalc JS library in frontend)
- Moon phase visualization (simple icon or emoji representation)
- Composite "astro score": green/yellow/red based on:
  - Clear skies (<20% cloud) + new/crescent moon (<30% illumination) = GREEN (great)
  - Partly cloudy or half moon = YELLOW (okay)
  - Cloudy or full moon = RED (bad)
- Show next window of good conditions if current is bad
- Refresh every hour

### 6. AI/Tech News Card
- Top 5 AI and engineering headlines of the day
- Sources: GNews API (free, 100/day) filtered to "artificial intelligence" topic
- Fallback: HackerNews API top stories filtered by AI/ML keywords
- Each headline is a clickable link opening in new tab
- Refresh every 3 hours

## Dashboard Layout
- Use react-grid-layout for drag-and-drop, resizable cards
- Persist layout to backend (JSON file or SQLite) so arrangement survives refresh
- Each card has:
  - A header with the card title and a collapse/expand toggle
  - A settings gear icon for card-specific config (like adding tickers)
  - A close/remove button
  - A manual refresh button
- An "Add Card" button in a toolbar to add back removed cards
- Dark theme by default (easier on eyes, looks good for a homepage)

## Backend Structure (Flask)
- `/api/stocks/quotes?symbols=AAPL,MSFT` - cached Finnhub quotes
- `/api/stocks/watchlist` - GET/POST/DELETE watchlist management
- `/api/stocks/signals` - computed buy/sell signals
- `/api/weather?lat=X&lon=Y` - cached Open-Meteo data
- `/api/news` - cached AI news headlines
- `/api/layout` - GET/PUT dashboard layout persistence
- All external API responses cached in SQLite with TTL
- Store API keys in a `.env` file (python-dotenv)

## Running the Project
- Backend: `cd backend && python app.py` (port 5001)
- Frontend: `cd frontend && npm run dev` (port 5173, proxied to backend)
- Production: `npm run build` then serve static files with Flask

## Key Constraints
- ALL free tier APIs only. No paid services.
- Cache aggressively to stay within rate limits
- The entire frontend + backend should work on a low-powered old laptop
- Must be accessible via Tailscale IP in a browser

PROJECTBRIEF
