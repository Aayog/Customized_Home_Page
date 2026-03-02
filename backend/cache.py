"""SQLite-backed cache with per-entry TTL."""
import sqlite3
import json
import time
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "cache.db")


def _conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with _conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS cache (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                expires_at REAL NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS watchlist (
                symbol TEXT PRIMARY KEY
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS layout (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                data TEXT NOT NULL
            )
        """)
        conn.commit()


def get(key: str):
    """Return cached value if not expired, else None."""
    with _conn() as conn:
        row = conn.execute(
            "SELECT value, expires_at FROM cache WHERE key = ?", (key,)
        ).fetchone()
    if row is None:
        return None
    if time.time() > row["expires_at"]:
        return None
    return json.loads(row["value"])


def set(key: str, value, ttl_seconds: int):
    """Store value in cache with a TTL."""
    expires_at = time.time() + ttl_seconds
    with _conn() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO cache (key, value, expires_at) VALUES (?, ?, ?)",
            (key, json.dumps(value), expires_at),
        )
        conn.commit()


def delete_expired():
    with _conn() as conn:
        conn.execute("DELETE FROM cache WHERE expires_at < ?", (time.time(),))
        conn.commit()


# --- Watchlist helpers ---

def get_watchlist():
    with _conn() as conn:
        rows = conn.execute("SELECT symbol FROM watchlist ORDER BY symbol").fetchall()
    return [r["symbol"] for r in rows]


def add_to_watchlist(symbol: str):
    with _conn() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO watchlist (symbol) VALUES (?)", (symbol.upper(),)
        )
        conn.commit()


def remove_from_watchlist(symbol: str):
    with _conn() as conn:
        conn.execute("DELETE FROM watchlist WHERE symbol = ?", (symbol.upper(),))
        conn.commit()


# --- Layout helpers ---

def get_layout():
    with _conn() as conn:
        row = conn.execute("SELECT data FROM layout WHERE id = 1").fetchone()
    if row is None:
        return None
    return json.loads(row["data"])


def save_layout(data):
    with _conn() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO layout (id, data) VALUES (1, ?)",
            (json.dumps(data),),
        )
        conn.commit()
