import React, { useState, useEffect, useCallback, useRef } from 'react'
import { ResponsiveGridLayout } from 'react-grid-layout'
import { API_BASE } from './config'
import StockHighlights from './components/StockHighlights'
import Watchlist from './components/Watchlist'
import AlertSignals from './components/AlertSignals'
import Weather from './components/Weather'
import AstroConditions from './components/AstroConditions'
import NewsCard from './components/NewsCard'

const CARD_REGISTRY = {
  stocks:    { label: 'Stock Highlights', icon: '📈', component: StockHighlights },
  watchlist: { label: 'Watchlist',        icon: '👁',  component: Watchlist },
  signals:   { label: 'Alert / Signals', icon: '🔔', component: AlertSignals },
  weather:   { label: 'Weather',         icon: '🌤', component: Weather },
  astro:     { label: 'Astro Conditions',icon: '🔭', component: AstroConditions },
  news:      { label: 'AI News',         icon: '📰', component: NewsCard },
}

const CARD_CONSTRAINTS = {
  stocks:    { minW: 3, minH: 5 },
  watchlist: { minW: 3, minH: 6 },
  signals:   { minW: 3, minH: 5 },
  weather:   { minW: 2, minH: 5 },
  astro:     { minW: 2, minH: 5 },
  news:      { minW: 3, minH: 5 },
}

// Clean 3-column default layout (12-col grid at lg, 10-col at md, 6-col at sm)
const DEFAULT_LAYOUT = {
  lg: [
    { i: 'stocks',    x: 0, y: 0,  w: 4, h: 8,  minW: 3, minH: 5 },
    { i: 'watchlist', x: 4, y: 0,  w: 4, h: 10, minW: 3, minH: 6 },
    { i: 'signals',   x: 8, y: 0,  w: 4, h: 9,  minW: 3, minH: 5 },
    { i: 'weather',   x: 0, y: 8,  w: 4, h: 7,  minW: 2, minH: 5 },
    { i: 'astro',     x: 4, y: 10, w: 4, h: 7,  minW: 2, minH: 5 },
    { i: 'news',      x: 8, y: 9,  w: 4, h: 9,  minW: 3, minH: 5 },
  ],
  md: [
    { i: 'stocks',    x: 0, y: 0,  w: 5, h: 8,  minW: 3, minH: 5 },
    { i: 'watchlist', x: 5, y: 0,  w: 5, h: 10, minW: 3, minH: 6 },
    { i: 'signals',   x: 0, y: 8,  w: 5, h: 9,  minW: 3, minH: 5 },
    { i: 'weather',   x: 5, y: 10, w: 5, h: 7,  minW: 2, minH: 5 },
    { i: 'astro',     x: 0, y: 17, w: 5, h: 7,  minW: 2, minH: 5 },
    { i: 'news',      x: 5, y: 17, w: 5, h: 9,  minW: 3, minH: 5 },
  ],
  sm: [
    { i: 'stocks',    x: 0, y: 0,  w: 6, h: 8,  minW: 3, minH: 5 },
    { i: 'watchlist', x: 0, y: 8,  w: 6, h: 10, minW: 3, minH: 6 },
    { i: 'signals',   x: 0, y: 18, w: 6, h: 9,  minW: 3, minH: 5 },
    { i: 'weather',   x: 0, y: 27, w: 6, h: 7,  minW: 2, minH: 5 },
    { i: 'astro',     x: 0, y: 34, w: 6, h: 7,  minW: 2, minH: 5 },
    { i: 'news',      x: 0, y: 41, w: 6, h: 9,  minW: 3, minH: 5 },
  ],
}

function applyConstraints(layouts) {
  const result = {}
  for (const [bp, items] of Object.entries(layouts)) {
    result[bp] = items.map(item => ({
      ...item,
      ...(CARD_CONSTRAINTS[item.i] || {}),
    }))
  }
  return result
}

const BREAKPOINTS = { lg: 1200, md: 768, sm: 0 }
const COLS       = { lg: 12,   md: 10,  sm: 6 }
const ROW_HEIGHT = 36
const LS_KEY = 'homelab_layout_v1'

function lsLoad() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) } catch { return null }
}
function lsSave(layouts, visibleCards) {
  try { localStorage.setItem(LS_KEY, JSON.stringify({ layouts, visibleCards })) } catch {}
}

// Live clock for the header
function LiveClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="text-right hidden md:block select-none">
      <div className="text-sm font-mono text-slate-300 leading-tight">
        {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div className="text-xs" style={{ color: '#475569' }}>
        {now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
      </div>
    </div>
  )
}

export default function App() {
  const [visibleCards, setVisibleCards] = useState(Object.keys(CARD_REGISTRY))
  const [layouts, setLayouts] = useState(DEFAULT_LAYOUT)
  const [layoutLoaded, setLayoutLoaded] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)
  // Start with a reasonable default width so the grid renders correctly even before measurement
  const [containerWidth, setContainerWidth] = useState(
    typeof window !== 'undefined' ? Math.max(window.innerWidth - 32, 320) : 1200
  )
  const containerRef = useRef(null)
  const debounceRef = useRef(null)

  // Attach ResizeObserver to the grid container once it's rendered.
  // We depend on `layoutLoaded` so the effect re-runs after <main> appears in the DOM.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width
      if (w > 0) setContainerWidth(w)
    })
    ro.observe(el)
    setContainerWidth(el.clientWidth) // immediate first measurement
    return () => ro.disconnect()
  }, [layoutLoaded])

  // Load layout: backend → localStorage → DEFAULT_LAYOUT
  useEffect(() => {
    fetch(`${API_BASE}/api/layout`)
      .then(r => r.json())
      .then(({ layout }) => {
        if (layout) {
          setLayouts(applyConstraints(layout.layouts || DEFAULT_LAYOUT))
          setVisibleCards(layout.visibleCards || Object.keys(CARD_REGISTRY))
        } else {
          // Nothing in backend — try localStorage
          const local = lsLoad()
          if (local) {
            setLayouts(applyConstraints(local.layouts || DEFAULT_LAYOUT))
            setVisibleCards(local.visibleCards || Object.keys(CARD_REGISTRY))
          }
        }
      })
      .catch(() => {
        // Backend unavailable — fall back to localStorage
        const local = lsLoad()
        if (local) {
          setLayouts(applyConstraints(local.layouts || DEFAULT_LAYOUT))
          setVisibleCards(local.visibleCards || Object.keys(CARD_REGISTRY))
        }
      })
      .finally(() => setLayoutLoaded(true))
  }, [])

  // Save to localStorage immediately, then debounce the backend write
  const persistLayout = useCallback((newLayouts, newVisible) => {
    lsSave(newLayouts, newVisible)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetch(`${API_BASE}/api/layout`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          layout: { layouts: newLayouts, visibleCards: newVisible },
        }),
      }).catch(() => {})
    }, 500)
  }, [])

  function onLayoutChange(currentLayout, allLayouts) {
    setLayouts(allLayouts)
    persistLayout(allLayouts, visibleCards)
  }

  function removeCard(cardId) {
    const next = visibleCards.filter(c => c !== cardId)
    setVisibleCards(next)
    persistLayout(layouts, next)
  }

  function addCard(cardId) {
    if (visibleCards.includes(cardId)) return
    const next = [...visibleCards, cardId]
    setVisibleCards(next)
    persistLayout(layouts, next)
    setShowAddMenu(false)
  }

  const hiddenCards = Object.keys(CARD_REGISTRY).filter(id => !visibleCards.includes(id))

  if (!layoutLoaded) {
    return (
      <div
        className="flex items-center justify-center h-screen"
        style={{ background: '#0f1119' }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-10 h-10">
            <div
              className="absolute inset-0 rounded-full"
              style={{ border: '2px solid #1e2438' }}
            />
            <div
              className="absolute inset-0 rounded-full animate-spin"
              style={{ border: '2px solid transparent', borderTopColor: '#6366f1' }}
            />
          </div>
          <p className="text-sm tracking-wide" style={{ color: '#475569' }}>
            Loading dashboard…
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#0f1119' }}>
      {/* ── Header ── */}
      <header
        className="flex items-center gap-3 px-5 h-14 sticky top-0 z-50"
        style={{
          background: 'rgba(15,17,25,0.88)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderBottom: '1px solid #1a1f30',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-lg leading-none">🏠</span>
          <span className="font-bold text-sm tracking-tight text-slate-100">Homelab</span>
          <span
            className="text-xs px-1.5 py-0.5 rounded font-bold tracking-widest"
            style={{ background: '#1a1f30', color: '#6366f1', border: '1px solid #252d45' }}
          >
            DASH
          </span>
        </div>

        <div className="flex-1" />
        <LiveClock />

        {/* Add Widget */}
        <div className="relative">
          <button
            onClick={() => setShowAddMenu(s => !s)}
            className="flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg"
            style={{
              background: showAddMenu ? '#1e284a' : '#1a1f30',
              color: '#818cf8',
              border: `1px solid ${showAddMenu ? '#3730a3' : '#252d45'}`,
              cursor: 'pointer',
              transition: 'background 150ms, border-color 150ms',
            }}
          >
            <svg viewBox="0 0 14 14" fill="none" width="13" height="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M7 2v10M2 7h10" />
            </svg>
            <span>Add Widget</span>
            {hiddenCards.length > 0 && (
              <span
                className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: '#1e1a4a', color: '#818cf8' }}
              >
                {hiddenCards.length}
              </span>
            )}
          </button>

          {showAddMenu && (
            <div
              className="absolute right-0 mt-2 w-56 rounded-xl overflow-hidden z-50"
              style={{
                background: '#13172a',
                border: '1px solid #252d45',
                boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.08)',
              }}
            >
              <div className="px-3 pt-3 pb-2">
                <p className="text-xs font-semibold tracking-widest" style={{ color: '#334155' }}>
                  WIDGETS
                </p>
              </div>
              {hiddenCards.length === 0 ? (
                <p className="text-xs px-4 py-4 text-center" style={{ color: '#334155' }}>
                  All widgets are visible
                </p>
              ) : (
                <div className="pb-1.5">
                  {hiddenCards.map(id => (
                    <AddMenuItem
                      key={id}
                      icon={CARD_REGISTRY[id].icon}
                      label={CARD_REGISTRY[id].label}
                      onClick={() => addCard(id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Click outside to close add menu */}
      {showAddMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowAddMenu(false)} />
      )}

      {/* ── Grid ── */}
      <main ref={containerRef} className="p-4">
        <ResponsiveGridLayout
          width={containerWidth}
          className="layout"
          layouts={layouts}
          breakpoints={BREAKPOINTS}
          cols={COLS}
          rowHeight={ROW_HEIGHT}
          draggableHandle=".drag-handle"
          onLayoutChange={onLayoutChange}
          margin={[12, 12]}
          containerPadding={[0, 0]}
          compactType="vertical"
          useCSSTransforms
          isResizable
          isDraggable
        >
          {visibleCards.map(cardId => {
            const CardComponent = CARD_REGISTRY[cardId]?.component
            if (!CardComponent) return null
            return (
              <div key={cardId}>
                <CardComponent onRemove={() => removeCard(cardId)} />
              </div>
            )
          })}
        </ResponsiveGridLayout>

        {visibleCards.length === 0 && (
          <div className="flex flex-col items-center justify-center py-40">
            <div className="text-5xl mb-5 opacity-20">📭</div>
            <p className="text-base font-semibold mb-1" style={{ color: '#475569' }}>
              Dashboard is empty
            </p>
            <p className="text-sm mb-6" style={{ color: '#334155' }}>
              Use "Add Widget" to restore your cards.
            </p>
            <button
              onClick={() => setShowAddMenu(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{
                background: '#1a1f30',
                color: '#818cf8',
                border: '1px solid #252d45',
                cursor: 'pointer',
              }}
            >
              + Add Widget
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

function AddMenuItem({ icon, label, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full text-left flex items-center gap-3 px-3.5 py-2.5 text-sm"
      style={{
        background: hovered ? '#1e2438' : 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: hovered ? '#e2e8f0' : '#94a3b8',
        transition: 'background 120ms, color 120ms',
      }}
    >
      <span className="text-base">{icon}</span>
      <span className="font-medium">{label}</span>
    </button>
  )
}
