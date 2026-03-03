import React, { useState } from 'react'

/**
 * CardShell wraps every widget card with:
 * - Dark styled container with shadow
 * - Header (title, collapse, settings, refresh, close) using SVG icons
 * - Collapse/expand toggle
 */
export default function CardShell({
  title,
  icon,
  children,
  onRemove,
  onRefresh,
  settingsContent,
  lastUpdated,
  loading,
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  return (
    <div
      className="flex flex-col h-full rounded-xl overflow-hidden"
      style={{
        background: '#161b2e',
        border: '1px solid #252d45',
        boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
      }}
    >
      {/* ── Header / drag handle ── */}
      <div
        className="drag-handle flex items-center gap-2 px-3.5 py-2.5 select-none cursor-grab active:cursor-grabbing shrink-0"
        style={{
          background: 'linear-gradient(135deg, #1c2340 0%, #161b2e 100%)',
          borderBottom: '1px solid #252d45',
        }}
      >
        {icon && <span className="text-sm leading-none shrink-0">{icon}</span>}
        <span className="flex-1 font-semibold text-sm text-slate-200 truncate tracking-tight">
          {title}
        </span>

        {lastUpdated && (
          <span
            className="text-xs hidden sm:block shrink-0"
            style={{ color: '#3d4a6b' }}
            title={lastUpdated.toLocaleString()}
          >
            {formatRelative(lastUpdated)}
          </span>
        )}

        <div className="flex items-center gap-0.5 ml-1 shrink-0">
          {onRefresh && (
            <IconBtn title={loading ? 'Loading…' : 'Refresh'} onClick={onRefresh} disabled={loading}>
              <IconRefresh spinning={loading} />
            </IconBtn>
          )}
          {settingsContent && (
            <IconBtn title="Settings" onClick={() => setShowSettings(s => !s)} active={showSettings}>
              <IconGear />
            </IconBtn>
          )}
          <IconBtn title={collapsed ? 'Expand' : 'Collapse'} onClick={() => setCollapsed(c => !c)}>
            <IconChevron up={!collapsed} />
          </IconBtn>
          {onRemove && (
            <IconBtn title="Remove card" onClick={onRemove} danger>
              <IconX />
            </IconBtn>
          )}
        </div>
      </div>

      {/* ── Settings panel ── */}
      {showSettings && settingsContent && (
        <div
          className="px-4 py-3 shrink-0"
          style={{ background: '#111626', borderBottom: '1px solid #252d45' }}
        >
          {settingsContent}
        </div>
      )}

      {/* ── Body ── */}
      {!collapsed && (
        <div className="flex-1 overflow-auto p-4 min-h-0">
          {children}
        </div>
      )}
    </div>
  )
}

// ── Icon button ─────────────────────────────────────────────────────────────

function IconBtn({ children, onClick, title, danger, disabled, active }) {
  const [hovered, setHovered] = useState(false)

  const color = danger
    ? (hovered ? '#f87171' : '#475569')
    : active
      ? '#818cf8'
      : (hovered ? '#e2e8f0' : '#475569')

  const bg = danger && hovered
    ? 'rgba(239,68,68,0.12)'
    : active
      ? 'rgba(99,102,241,0.15)'
      : hovered
        ? 'rgba(255,255,255,0.07)'
        : 'transparent'

  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 28,
        height: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 7,
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: bg,
        color,
        opacity: disabled ? 0.35 : 1,
        transition: 'background 120ms ease, color 120ms ease',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

// ── SVG icons ────────────────────────────────────────────────────────────────

function IconRefresh({ spinning }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      width="13"
      height="13"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={spinning ? { animation: 'spin 0.8s linear infinite' } : undefined}
    >
      <path d="M13.5 8A5.5 5.5 0 1 1 9 2.6" />
      <path d="M13.5 2.5v3.5h-3.5" />
    </svg>
  )
}

function IconGear() {
  return (
    <svg viewBox="0 0 16 16" fill="none" width="13" height="13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <circle cx="8" cy="8" r="2.2" />
      <path d="M8 1.5V3M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1" />
    </svg>
  )
}

function IconChevron({ up }) {
  return (
    <svg viewBox="0 0 14 14" fill="none" width="12" height="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {up
        ? <path d="M3 9l4-4 4 4" />
        : <path d="M3 5l4 4 4-4" />
      }
    </svg>
  )
}

function IconX() {
  return (
    <svg viewBox="0 0 14 14" fill="none" width="11" height="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M3 3l8 8M11 3l-8 8" />
    </svg>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatRelative(date) {
  const diff = Math.floor((Date.now() - date) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}
