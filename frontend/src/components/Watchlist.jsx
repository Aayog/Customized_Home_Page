import React, { useState } from 'react'
import CardShell from './CardShell'
import { useApi } from '../hooks/useApi'
import { API_BASE } from '../config'

const REFRESH_MS = 5 * 60 * 1000

export default function Watchlist({ onRemove }) {
  const [addInput, setAddInput] = useState('')
  const { data, loading, error, refetch, lastUpdated } = useApi(
    `${API_BASE}/api/stocks/watchlist`,
    REFRESH_MS,
  )

  async function addSymbol() {
    const sym = addInput.trim().toUpperCase()
    if (!sym) return
    await fetch(`${API_BASE}/api/stocks/watchlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: sym }),
    })
    setAddInput('')
    refetch()
  }

  async function removeSymbol(sym) {
    await fetch(`${API_BASE}/api/stocks/watchlist`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: sym }),
    })
    refetch()
  }

  const quotes = data?.quotes || []

  return (
    <CardShell
      title="Watchlist"
      icon="👁"
      onRemove={onRemove}
      onRefresh={refetch}
      lastUpdated={lastUpdated}
      loading={loading}
    >
      {/* Add ticker */}
      <div className="flex gap-2 mb-3">
        <input
          className="flex-1 bg-slate-800 text-slate-200 text-xs rounded px-2 py-1 border border-slate-600 outline-none"
          value={addInput}
          onChange={e => setAddInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addSymbol()}
          placeholder="Add ticker (e.g. AAPL)"
        />
        <button
          className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded"
          onClick={addSymbol}
        >
          Add
        </button>
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}
      {loading && !data && <Skeleton rows={3} />}

      <div className="flex flex-col gap-2">
        {quotes.map(q => (
          <WatchRow key={q.symbol} q={q} onRemove={() => removeSymbol(q.symbol)} />
        ))}
        {!loading && quotes.length === 0 && (
          <p className="text-slate-500 text-xs text-center py-4">No stocks in watchlist</p>
        )}
      </div>
    </CardShell>
  )
}

function WatchRow({ q, onRemove }) {
  const up = q.change_pct >= 0
  const range52 = q.high52 && q.low52
    ? `$${q.low52} – $${q.high52}`
    : null

  // Simple sparkline-style bar showing position in day range
  const dayRange = q.high - q.low
  const pct = dayRange > 0 ? ((q.price - q.low) / dayRange) * 100 : 50

  return (
    <div className="rounded-lg p-3" style={{ background: '#252a3c' }}>
      <div className="flex items-start justify-between mb-1">
        <div>
          <span className="font-bold text-sm text-slate-100">{q.symbol}</span>
          {q.name && <span className="text-xs text-slate-500 ml-2">{q.name}</span>}
        </div>
        <button
          onClick={onRemove}
          className="text-slate-500 hover:text-red-400 text-xs ml-2"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          title="Remove from watchlist"
        >
          ✕
        </button>
      </div>

      <div className="flex items-center gap-3 mb-2">
        <span className="font-mono text-lg font-semibold text-slate-100">${q.price?.toFixed(2)}</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${up ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
          {up ? '+' : ''}{q.change?.toFixed(2)} ({up ? '+' : ''}{q.change_pct?.toFixed(2)}%)
        </span>
      </div>

      {/* Day range bar */}
      <div className="mb-1">
        <div className="flex justify-between text-xs text-slate-500 mb-0.5">
          <span>Lo ${q.low?.toFixed(2)}</span>
          <span>Day range</span>
          <span>Hi ${q.high?.toFixed(2)}</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-700 relative">
          <div
            className="absolute top-0 h-1.5 w-1.5 rounded-full bg-indigo-400 -translate-x-1/2"
            style={{ left: `${Math.min(Math.max(pct, 2), 98)}%` }}
          />
        </div>
      </div>

      {q.volume && (
        <p className="text-xs text-slate-500 mt-1">Vol {formatVolume(q.volume)}</p>
      )}
    </div>
  )
}

function formatVolume(v) {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`
  return String(v)
}

function Skeleton({ rows }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-20 rounded-lg bg-slate-800/60 animate-pulse" />
      ))}
    </div>
  )
}
