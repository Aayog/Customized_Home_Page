import React from 'react'
import CardShell from './CardShell'
import { useApi } from '../hooks/useApi'
import { API_BASE } from '../config'

const REFRESH_MS = 3 * 60 * 60 * 1000

export default function NewsCard({ onRemove }) {
  const { data, loading, error, refetch, lastUpdated } = useApi(
    `${API_BASE}/api/news`,
    REFRESH_MS,
  )

  const articles = data?.articles || []

  return (
    <CardShell
      title="AI / Tech News"
      icon="📰"
      onRemove={onRemove}
      onRefresh={refetch}
      lastUpdated={lastUpdated}
      loading={loading}
    >
      {error && <p className="text-red-400 text-xs">{error}</p>}
      {loading && !data && <Skeleton rows={5} />}

      <div className="flex flex-col divide-y" style={{ borderColor: '#2e3450' }}>
        {articles.map((a, i) => (
          <div key={i} className="py-2.5 first:pt-0">
            <a
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-slate-200 hover:text-indigo-300 leading-snug font-medium block mb-1"
            >
              {a.title}
            </a>
            <div className="flex gap-2 text-xs text-slate-500">
              <span>{a.source}</span>
              {a.published_at && (
                <span>· {formatRelative(a.published_at)}</span>
              )}
              {a.score && <span>· ▲ {a.score}</span>}
            </div>
          </div>
        ))}
        {!loading && articles.length === 0 && (
          <p className="text-slate-500 text-xs text-center py-4">No articles found</p>
        )}
      </div>

      {data?.source && (
        <p className="text-xs text-slate-600 mt-2 text-right">Source: {data.source}</p>
      )}
    </CardShell>
  )
}

function formatRelative(isoStr) {
  try {
    const d = new Date(isoStr)
    const diff = Math.floor((Date.now() - d) / 1000)
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  } catch {
    return ''
  }
}

function Skeleton({ rows }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-1">
          <div className="h-4 rounded bg-slate-800/60 animate-pulse w-full" />
          <div className="h-3 rounded bg-slate-800/40 animate-pulse w-1/3" />
        </div>
      ))}
    </div>
  )
}
