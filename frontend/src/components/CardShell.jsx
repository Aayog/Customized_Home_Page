import React, { useState } from 'react'

/**
 * CardShell wraps every widget card with:
 * - Dark styled container
 * - Header (title, collapse, settings, refresh, close)
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
    <div className="flex flex-col h-full rounded-xl overflow-hidden"
      style={{ background: '#1e2130', border: '1px solid #2e3450' }}>

      {/* Header — drag handle */}
      <div
        className="drag-handle flex items-center gap-2 px-4 py-2.5 select-none cursor-grab active:cursor-grabbing shrink-0"
        style={{ background: '#252a3c', borderBottom: '1px solid #2e3450' }}
      >
        {icon && <span className="text-base">{icon}</span>}
        <span className="flex-1 font-semibold text-sm text-slate-200 truncate">{title}</span>

        {lastUpdated && (
          <span className="text-xs text-slate-500 hidden sm:block" title={lastUpdated.toLocaleString()}>
            {formatRelative(lastUpdated)}
          </span>
        )}

        <div className="flex items-center gap-1 ml-2">
          {onRefresh && (
            <HeaderBtn title="Refresh" onClick={onRefresh} disabled={loading}>
              {loading ? '⟳' : '↻'}
            </HeaderBtn>
          )}
          {settingsContent && (
            <HeaderBtn title="Settings" onClick={() => setShowSettings(s => !s)}>⚙</HeaderBtn>
          )}
          <HeaderBtn title={collapsed ? 'Expand' : 'Collapse'} onClick={() => setCollapsed(c => !c)}>
            {collapsed ? '▲' : '▼'}
          </HeaderBtn>
          {onRemove && (
            <HeaderBtn title="Remove card" onClick={onRemove} danger>✕</HeaderBtn>
          )}
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && settingsContent && (
        <div className="px-4 py-3 shrink-0" style={{ background: '#1a1f30', borderBottom: '1px solid #2e3450' }}>
          {settingsContent}
        </div>
      )}

      {/* Body */}
      {!collapsed && (
        <div className="flex-1 overflow-auto p-4 min-h-0">
          {children}
        </div>
      )}
    </div>
  )
}

function HeaderBtn({ children, onClick, title, danger, disabled }) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={[
        'w-7 h-7 rounded flex items-center justify-center text-xs transition-colors',
        danger
          ? 'text-red-400 hover:bg-red-900/30'
          : 'text-slate-400 hover:bg-slate-700/60',
        disabled ? 'opacity-40 cursor-not-allowed' : '',
      ].join(' ')}
      style={{ border: 'none', background: 'transparent', cursor: disabled ? 'not-allowed' : 'pointer' }}
    >
      {children}
    </button>
  )
}

function formatRelative(date) {
  const diff = Math.floor((Date.now() - date) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}
