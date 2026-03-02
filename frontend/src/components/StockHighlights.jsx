import React, { useState } from 'react'
import CardShell from './CardShell'
import { useApi } from '../hooks/useApi'
import { API_BASE } from '../config'

const DEFAULT_SYMBOLS = 'AAPL,MSFT,GOOGL,AMZN,NVDA,TSLA,META'
const REFRESH_MS = 5 * 60 * 1000

export default function StockHighlights({ onRemove }) {
  const [symbols, setSymbols] = useState(DEFAULT_SYMBOLS)
  const [input, setInput] = useState(symbols)

  const { data, loading, error, refetch, lastUpdated } = useApi(
    `${API_BASE}/api/stocks/quotes?symbols=${symbols}`,
    REFRESH_MS,
    [symbols],
  )

  const settings = (
    <div className="flex gap-2">
      <input
        className="flex-1 bg-slate-800 text-slate-200 text-xs rounded px-2 py-1 border border-slate-600 outline-none"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="AAPL,MSFT,..."
      />
      <button
        className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded"
        onClick={() => setSymbols(input.toUpperCase())}
      >
        Apply
      </button>
    </div>
  )

  return (
    <CardShell
      title="Stock Highlights"
      icon="📈"
      onRemove={onRemove}
      onRefresh={refetch}
      settingsContent={settings}
      lastUpdated={lastUpdated}
      loading={loading}
    >
      {error && <p className="text-red-400 text-xs">{error}</p>}
      {loading && !data && <Skeleton rows={7} />}
      {data && (
        <div className="flex flex-col gap-1">
          {data.map(q => (
            <StockRow key={q.symbol} q={q} />
          ))}
        </div>
      )}
    </CardShell>
  )
}

function StockRow({ q }) {
  const up = q.change_pct >= 0
  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-800/40 transition-colors">
      <span className="font-bold text-sm text-slate-100 w-16">{q.symbol}</span>
      <span className="text-sm font-mono text-slate-200">${q.price?.toFixed(2)}</span>
      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${up ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
        {up ? '+' : ''}{q.change_pct?.toFixed(2)}%
      </span>
    </div>
  )
}

function Skeleton({ rows }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-8 rounded-lg bg-slate-800/60 animate-pulse" />
      ))}
    </div>
  )
}
