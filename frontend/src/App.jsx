import React, { useState, useEffect, useCallback, useRef } from 'react'
import { ResponsiveGridLayout } from 'react-grid-layout'
import StockHighlights from './components/StockHighlights'
import Watchlist from './components/Watchlist'
import AlertSignals from './components/AlertSignals'
import Weather from './components/Weather'
import AstroConditions from './components/AstroConditions'
import NewsCard from './components/NewsCard'


const CARD_REGISTRY = {
  stocks:   { label: 'Stock Highlights', icon: '📈', component: StockHighlights },
  watchlist:{ label: 'Watchlist',         icon: '👁',  component: Watchlist },
  signals:  { label: 'Alert / Signals',  icon: '🔔', component: AlertSignals },
  weather:  { label: 'Weather',          icon: '🌤', component: Weather },
  astro:    { label: 'Astro Conditions', icon: '🔭', component: AstroConditions },
  news:     { label: 'AI News',          icon: '📰', component: NewsCard },
}

// Minimum size constraints per card so they can't be shrunk to uselessness
const CARD_CONSTRAINTS = {
  stocks:    { minW: 3, minH: 5 },
  watchlist: { minW: 3, minH: 6 },
  signals:   { minW: 3, minH: 5 },
  weather:   { minW: 2, minH: 5 },
  astro:     { minW: 2, minH: 5 },
  news:      { minW: 3, minH: 5 },
}

// Clean 3-column default layout (12-col grid at lg, 10-col at md, 6-col at sm)
// Watchlist and Signals are taller; Weather and Astro are shorter.
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

// Ensure min-size constraints survive a save/load round-trip
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

export default function App() {
  const [visibleCards, setVisibleCards] = useState(Object.keys(CARD_REGISTRY))
  const [layouts, setLayouts] = useState(DEFAULT_LAYOUT)
  const [layoutLoaded, setLayoutLoaded] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)

  // Ref for debouncing layout persistence
  const debounceRef = useRef(null)

  // Load layout from backend on mount
  useEffect(() => {
    fetch('/api/layout')
      .then(r => r.json())
      .then(({ layout }) => {
        if (layout) {
          setLayouts(applyConstraints(layout.layouts || DEFAULT_LAYOUT))
          setVisibleCards(layout.visibleCards || Object.keys(CARD_REGISTRY))
        }
      })
      .catch(() => {})
      .finally(() => setLayoutLoaded(true))
  }, [])

  // Debounced persist — 500ms after the last drag/resize event
  const persistLayout = useCallback((newLayouts, newVisible) => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetch('/api/layout', {
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
      <div className="flex items-center justify-center h-screen text-slate-400">
        Loading dashboard...
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Toolbar */}
      <header
        className="flex items-center gap-4 px-6 py-3 sticky top-0 z-50"
        style={{ background: '#0f1119', borderBottom: '1px solid #1e2130' }}
      >
        <span className="text-lg font-bold text-indigo-400">🏠 Homelab Dashboard</span>
        <span className="flex-1" />

        {/* Add Card */}
        <div className="relative">
          <button
            onClick={() => setShowAddMenu(s => !s)}
            className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg flex items-center gap-2"
            style={{ border: 'none', cursor: 'pointer' }}
          >
            <span>+ Add Card</span>
            {hiddenCards.length > 0 && (
              <span className="bg-indigo-800 text-xs px-1.5 py-0.5 rounded-full">{hiddenCards.length}</span>
            )}
          </button>
          {showAddMenu && (
            <div
              className="absolute right-0 mt-2 w-52 rounded-xl overflow-hidden shadow-2xl z-50"
              style={{ background: '#1e2130', border: '1px solid #2e3450' }}
            >
              {hiddenCards.length === 0 ? (
                <p className="text-xs text-slate-500 px-4 py-3">All cards visible</p>
              ) : (
                hiddenCards.map(id => (
                  <button
                    key={id}
                    onClick={() => addCard(id)}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700/50 flex items-center gap-2"
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <span>{CARD_REGISTRY[id].icon}</span>
                    <span>{CARD_REGISTRY[id].label}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </header>

      {/* Click outside to close add menu */}
      {showAddMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowAddMenu(false)} />
      )}

      {/* Grid */}
      <main className="p-4">
        <ResponsiveGridLayout
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
          <div className="flex flex-col items-center justify-center py-32 text-slate-500">
            <p className="text-5xl mb-4">📭</p>
            <p className="text-lg font-semibold mb-2">No cards visible</p>
            <p className="text-sm">Use the &ldquo;+ Add Card&rdquo; button to restore cards.</p>
          </div>
        )}
      </main>
    </div>
  )
}
