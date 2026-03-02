import React from 'react'
import CardShell from './CardShell'
import { useApi } from '../hooks/useApi'

const REFRESH_MS = 60 * 60 * 1000 // 1 hour (signals computed once daily)

const COLOR_MAP = {
  green: { badge: 'bg-green-900/50 text-green-300 border border-green-700/40' },
  yellow: { badge: 'bg-yellow-900/50 text-yellow-300 border border-yellow-700/40' },
  red: { badge: 'bg-red-900/50 text-red-300 border border-red-700/40' },
}

export default function AlertSignals({ onRemove }) {
  const { data, loading, error, refetch, lastUpdated } = useApi(
    '/api/stocks/signals',
    REFRESH_MS,
  )

  const hasAny = data?.some(s => s.signals.length > 0)

  return (
    <CardShell
      title="Alert / Signals"
      icon="🔔"
      onRemove={onRemove}
      onRefresh={refetch}
      lastUpdated={lastUpdated}
      loading={loading}
    >
      {error && <p className="text-red-400 text-xs">{error}</p>}
      {loading && !data && <Skeleton rows={3} />}

      {data && (
        <>
          {!hasAny && (
            <p className="text-slate-500 text-xs text-center py-6">
              No signals detected in current watchlist
            </p>
          )}
          <div className="flex flex-col gap-3">
            {data.filter(s => s.signals.length > 0).map(({ symbol, signals }) => (
              <div key={symbol} className="rounded-lg p-3" style={{ background: '#252a3c' }}>
                <p className="font-bold text-sm text-slate-200 mb-2">{symbol}</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {signals.map((sig, i) => (
                    <span
                      key={i}
                      className={`text-xs font-semibold px-2 py-0.5 rounded ${(COLOR_MAP[sig.color] || COLOR_MAP.yellow).badge}`}
                      title={sig.detail}
                    >
                      {sig.label}
                    </span>
                  ))}
                </div>
                {signals.map((sig, i) => (
                  <p key={i} className="text-xs text-slate-400">{sig.detail}</p>
                ))}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-600 mt-3 text-center italic">
            Not financial advice. Educational purposes only.
          </p>
        </>
      )}
    </CardShell>
  )
}

function Skeleton({ rows }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 rounded-lg bg-slate-800/60 animate-pulse" />
      ))}
    </div>
  )
}
