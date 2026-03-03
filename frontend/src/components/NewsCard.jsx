import React, { useState } from 'react'
import CardShell from './CardShell'
import { useApi } from '../hooks/useApi'
import { API_BASE } from '../config'

const REFRESH_MS = 3 * 60 * 60 * 1000
const LS_FAV = 'news_favorites_v1'
const LS_IGN = 'news_ignored_v1'

function lsRead(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}
function lsWrite(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

export default function NewsCard({ onRemove }) {
  const { data, loading, error, refetch, lastUpdated } = useApi(
    `${API_BASE}/api/news`,
    REFRESH_MS,
  )

  const [favorites, setFavorites] = useState(() => lsRead(LS_FAV, []))
  const [ignored, setIgnored]     = useState(() => lsRead(LS_IGN, []))
  const [tab, setTab]             = useState('latest') // 'latest' | 'saved'

  const allArticles = data?.articles || []
  // Latest: filter out ignored. Saved: the favorites list.
  const latestArticles = allArticles.filter(a => !ignored.includes(a.url))
  const displayArticles = tab === 'saved' ? favorites : latestArticles

  const isFav = url => favorites.some(f => f.url === url)

  function toggleFav(article) {
    const next = isFav(article.url)
      ? favorites.filter(f => f.url !== article.url)
      : [article, ...favorites]
    setFavorites(next)
    lsWrite(LS_FAV, next)
  }

  function ignoreArticle(article) {
    const next = [...ignored, article.url]
    setIgnored(next)
    lsWrite(LS_IGN, next)
  }

  function unignoreAll() {
    setIgnored([])
    lsWrite(LS_IGN, [])
  }

  return (
    <CardShell
      title="AI / Tech News"
      icon="📰"
      onRemove={onRemove}
      onRefresh={refetch}
      lastUpdated={lastUpdated}
      loading={loading}
    >
      {/* ── Tab bar ── */}
      <div
        className="flex items-center mb-3 -mx-4 px-4"
        style={{ borderBottom: '1px solid #252d45', marginTop: -4 }}
      >
        <TabButton active={tab === 'latest'} onClick={() => setTab('latest')}>
          Latest
        </TabButton>
        <TabButton active={tab === 'saved'} onClick={() => setTab('saved')}>
          Saved{favorites.length > 0 ? ` (${favorites.length})` : ''}
        </TabButton>

        {/* Unignore all — only shown on Latest tab when something is ignored */}
        {tab === 'latest' && ignored.length > 0 && (
          <button
            onClick={unignoreAll}
            title={`Un-ignore ${ignored.length} hidden article${ignored.length > 1 ? 's' : ''}`}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 11,
              color: '#3d4a6b',
              padding: '0 0 8px',
              transition: 'color 120ms',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#6366f1')}
            onMouseLeave={e => (e.currentTarget.style.color = '#3d4a6b')}
          >
            Unhide {ignored.length}
          </button>
        )}
      </div>

      {/* ── Error / skeleton ── */}
      {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
      {loading && !data && <Skeleton />}

      {/* ── Article list ── */}
      <div>
        {displayArticles.map((a, i) => (
          <ArticleRow
            key={a.url || i}
            article={a}
            favorited={isFav(a.url)}
            showIgnore={tab === 'latest'}
            onToggleFav={() => toggleFav(a)}
            onIgnore={() => ignoreArticle(a)}
          />
        ))}

        {!loading && displayArticles.length === 0 && (
          <EmptyState tab={tab} />
        )}
      </div>

      {/* ── Source attribution ── */}
      {data?.source && (
        <p className="text-xs mt-3 text-right" style={{ color: '#2a3050' }}>
          via {data.source}
        </p>
      )}
    </CardShell>
  )
}

// ── Tab button ───────────────────────────────────────────────────────────────

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '0 4px 9px',
        marginRight: 16,
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        color: active ? '#818cf8' : '#475569',
        borderBottom: active ? '2px solid #6366f1' : '2px solid transparent',
        marginBottom: -1,
        transition: 'color 120ms, border-color 120ms',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}

// ── Article row ──────────────────────────────────────────────────────────────

function ArticleRow({ article: a, favorited, showIgnore, onToggleFav, onIgnore }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        padding: '10px 0',
        borderBottom: '1px solid #1c2238',
      }}
    >
      {/* Article text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <a
          href={a.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            fontSize: 13,
            fontWeight: 500,
            lineHeight: 1.5,
            color: '#c1cade',
            textDecoration: 'none',
            marginBottom: 4,
            transition: 'color 120ms',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#a5b4fc')}
          onMouseLeave={e => (e.currentTarget.style.color = '#c1cade')}
        >
          {a.title}
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {a.source && (
            <span style={{ fontSize: 11, fontWeight: 500, color: '#3d4a6b' }}>
              {a.source}
            </span>
          )}
          {a.published_at && (
            <span style={{ fontSize: 11, color: '#2a3050' }}>
              · {formatRelative(a.published_at)}
            </span>
          )}
          {a.score != null && (
            <span style={{ fontSize: 11, color: '#2a3050' }}>
              · ▲ {a.score}
            </span>
          )}
        </div>
      </div>

      {/* Action buttons — visible on hover */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flexShrink: 0,
          opacity: hovered || favorited ? 1 : 0,
          transition: 'opacity 150ms',
        }}
      >
        {/* Star / un-star */}
        <ArticleBtn
          title={favorited ? 'Remove from saved' : 'Save for later'}
          onClick={onToggleFav}
          color={favorited ? '#f59e0b' : undefined}
          hoverColor="#f59e0b"
        >
          <svg
            viewBox="0 0 16 16"
            fill={favorited ? 'currentColor' : 'none'}
            width="13"
            height="13"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          >
            <path d="M8 1.5l1.8 3.65 4.03.59-2.92 2.84.69 4.02L8 10.5l-3.6 1.1.69-4.02L2.17 4.74l4.03-.59L8 1.5z" />
          </svg>
        </ArticleBtn>

        {/* Ignore / hide */}
        {showIgnore && (
          <ArticleBtn title="Hide this article" onClick={onIgnore} hoverColor="#f87171" danger>
            <svg viewBox="0 0 14 14" fill="none" width="11" height="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 3l8 8M11 3l-8 8" />
            </svg>
          </ArticleBtn>
        )}
      </div>
    </div>
  )
}

function ArticleBtn({ children, onClick, title, color, hoverColor, danger }) {
  const [hovered, setHovered] = useState(false)

  const currentColor = hovered
    ? (hoverColor || (danger ? '#f87171' : '#e2e8f0'))
    : (color || '#3d4a6b')

  const bg = hovered
    ? (danger ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)')
    : 'transparent'

  return (
    <button
      onClick={e => { e.preventDefault(); e.stopPropagation(); onClick() }}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 26,
        height: 26,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 6,
        border: 'none',
        cursor: 'pointer',
        background: bg,
        color: currentColor,
        transition: 'background 100ms, color 100ms',
      }}
    >
      {children}
    </button>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ tab }) {
  return (
    <div
      className="flex flex-col items-center gap-2 py-8 text-center"
      style={{ color: '#2a3050' }}
    >
      <span style={{ fontSize: 28, opacity: 0.4 }}>
        {tab === 'saved' ? '⭐' : '📭'}
      </span>
      <p style={{ fontSize: 12 }}>
        {tab === 'saved'
          ? 'No saved articles yet.'
          : 'No articles available.'}
      </p>
      {tab === 'saved' && (
        <p style={{ fontSize: 11, color: '#1e2640' }}>
          Star articles on the Latest tab to save them here.
        </p>
      )}
    </div>
  )
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div
            className="animate-pulse rounded"
            style={{ height: 13, background: '#1c2238', width: '100%' }}
          />
          <div
            className="animate-pulse rounded"
            style={{ height: 11, background: '#181d30', width: '38%' }}
          />
        </div>
      ))}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRelative(isoStr) {
  try {
    const diff = Math.floor((Date.now() - new Date(isoStr)) / 1000)
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  } catch {
    return ''
  }
}
