import React, { useState } from 'react'
import CardShell from './CardShell'
import { useApi } from '../hooks/useApi'

const REFRESH_MS = 30 * 60 * 1000

const WMO_ICONS = {
  0: '☀️', 1: '🌤', 2: '⛅', 3: '☁️',
  45: '🌫', 48: '🌫',
  51: '🌦', 53: '🌦', 55: '🌧',
  61: '🌧', 63: '🌧', 65: '🌧',
  71: '🌨', 73: '❄️', 75: '❄️', 77: '❄️',
  80: '🌦', 81: '🌧', 82: '⛈',
  85: '🌨', 86: '❄️',
  95: '⛈', 96: '⛈', 99: '⛈',
}

// Milwaukee, WI defaults
const DEFAULT_LAT = '43.0389'
const DEFAULT_LON = '-87.9065'
const DEFAULT_CITY = 'Milwaukee, WI'

export default function Weather({ onRemove }) {
  const [lat, setLat] = useState(DEFAULT_LAT)
  const [lon, setLon] = useState(DEFAULT_LON)
  const [city, setCity] = useState(DEFAULT_CITY)
  const [latInput, setLatInput] = useState(lat)
  const [lonInput, setLonInput] = useState(lon)
  const [cityInput, setCityInput] = useState(city)

  const { data, loading, error, refetch, lastUpdated } = useApi(
    `/api/weather?lat=${lat}&lon=${lon}`,
    REFRESH_MS,
    [lat, lon],
  )

  const settings = (
    <div className="flex flex-col gap-2">
      <input
        className="bg-slate-800 text-slate-200 text-xs rounded px-2 py-1 border border-slate-600 outline-none"
        value={cityInput}
        onChange={e => setCityInput(e.target.value)}
        placeholder="City name (display only)"
      />
      <div className="flex gap-2">
        <input
          className="flex-1 bg-slate-800 text-slate-200 text-xs rounded px-2 py-1 border border-slate-600 outline-none"
          value={latInput}
          onChange={e => setLatInput(e.target.value)}
          placeholder="Latitude"
        />
        <input
          className="flex-1 bg-slate-800 text-slate-200 text-xs rounded px-2 py-1 border border-slate-600 outline-none"
          value={lonInput}
          onChange={e => setLonInput(e.target.value)}
          placeholder="Longitude"
        />
      </div>
      <button
        className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded self-end"
        onClick={() => { setLat(latInput); setLon(lonInput); setCity(cityInput) }}
      >
        Apply
      </button>
    </div>
  )

  const current = data?.current
  const forecast = data?.forecast || []

  return (
    <CardShell
      title={`Weather — ${city}`}
      icon="🌤"
      onRemove={onRemove}
      onRefresh={refetch}
      settingsContent={settings}
      lastUpdated={lastUpdated}
      loading={loading}
    >
      {error && <p className="text-red-400 text-xs">{error}</p>}
      {loading && !data && <div className="h-32 rounded-lg bg-slate-800/60 animate-pulse" />}

      {current && (
        <>
          {/* Current conditions */}
          <div className="flex items-center gap-4 mb-4">
            <span className="text-5xl">{WMO_ICONS[current.weather_code] || '🌡'}</span>
            <div>
              <p className="text-3xl font-bold text-slate-100">{current.temperature?.toFixed(0)}°F</p>
              <p className="text-sm text-slate-400">{current.condition}</p>
            </div>
            <div className="ml-auto text-right text-xs text-slate-400 space-y-1">
              <p>💧 {current.humidity}%</p>
              <p>💨 {current.wind_speed?.toFixed(0)} mph</p>
              <p>☁ {current.cloud_cover}%</p>
            </div>
          </div>

          {/* 3-day forecast */}
          <div className="grid grid-cols-3 gap-2">
            {forecast.slice(1, 4).map(day => (
              <div
                key={day.date}
                className="rounded-lg p-2 text-center"
                style={{ background: '#252a3c' }}
              >
                <p className="text-xs text-slate-400 mb-1">{formatDay(day.date)}</p>
                <p className="text-xl mb-1">{WMO_ICONS[day.weather_code] || '🌡'}</p>
                <p className="text-xs text-slate-200 font-semibold">
                  {day.temp_max?.toFixed(0)}° / {day.temp_min?.toFixed(0)}°
                </p>
                {day.precipitation > 0 && (
                  <p className="text-xs text-blue-400">{day.precipitation?.toFixed(2)}"</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </CardShell>
  )
}

function formatDay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short' })
}
