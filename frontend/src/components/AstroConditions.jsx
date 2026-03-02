import React, { useState, useEffect } from 'react'
import SunCalc from 'suncalc'
import CardShell from './CardShell'
import { useApi } from '../hooks/useApi'
import { API_BASE } from '../config'

const REFRESH_MS = 60 * 60 * 1000

const DEFAULT_LAT = 43.0389
const DEFAULT_LON = -87.9065
const DEFAULT_CITY = 'Milwaukee, WI'

function getMoonInfo(lat, lon) {
  const now = new Date()
  const illum = SunCalc.getMoonIllumination(now)
  const moonPos = SunCalc.getMoonPosition(now, lat, lon)
  const fraction = illum.fraction // 0-1
  const phaseName = getPhaseName(illum.phase)
  const phaseEmoji = getPhaseEmoji(illum.phase)
  return {
    fraction: Math.round(fraction * 100),
    phase: illum.phase,
    phaseName,
    phaseEmoji,
    altitude: moonPos.altitude,
    aboveHorizon: moonPos.altitude > 0,
  }
}

function getPhaseName(phase) {
  // phase 0-1
  if (phase < 0.03 || phase > 0.97) return 'New Moon'
  if (phase < 0.22) return 'Waxing Crescent'
  if (phase < 0.28) return 'First Quarter'
  if (phase < 0.47) return 'Waxing Gibbous'
  if (phase < 0.53) return 'Full Moon'
  if (phase < 0.72) return 'Waning Gibbous'
  if (phase < 0.78) return 'Last Quarter'
  return 'Waning Crescent'
}

function getPhaseEmoji(phase) {
  if (phase < 0.03 || phase > 0.97) return '🌑'
  if (phase < 0.25) return '🌒'
  if (phase < 0.27) return '🌓'
  if (phase < 0.5) return '🌔'
  if (phase < 0.52) return '🌕'
  if (phase < 0.75) return '🌖'
  if (phase < 0.77) return '🌗'
  return '🌘'
}

function getAstroScore(cloudCover, moonFraction) {
  const clearSky = cloudCover < 20
  const partlyCloudy = cloudCover < 50
  const darkMoon = moonFraction < 30
  const halfMoon = moonFraction < 60

  if (clearSky && darkMoon) {
    return { score: 'GREAT', color: 'text-green-400', bg: 'bg-green-900/30 border-green-700/40', emoji: '🟢', label: 'Great conditions!' }
  }
  if (partlyCloudy && halfMoon) {
    return { score: 'OKAY', color: 'text-yellow-400', bg: 'bg-yellow-900/30 border-yellow-700/40', emoji: '🟡', label: 'Okay conditions' }
  }
  return { score: 'BAD', color: 'text-red-400', bg: 'bg-red-900/30 border-red-700/40', emoji: '🔴', label: 'Poor conditions' }
}

export default function AstroConditions({ onRemove }) {
  const [lat, setLat] = useState(DEFAULT_LAT)
  const [lon, setLon] = useState(DEFAULT_LON)
  const [city, setCity] = useState(DEFAULT_CITY)
  const [latInput, setLatInput] = useState(String(DEFAULT_LAT))
  const [lonInput, setLonInput] = useState(String(DEFAULT_LON))
  const [cityInput, setCityInput] = useState(DEFAULT_CITY)
  const [moonInfo, setMoonInfo] = useState(() => getMoonInfo(DEFAULT_LAT, DEFAULT_LON))

  useEffect(() => {
    setMoonInfo(getMoonInfo(lat, lon))
    const id = setInterval(() => setMoonInfo(getMoonInfo(lat, lon)), 60 * 1000)
    return () => clearInterval(id)
  }, [lat, lon])

  const { data, loading, error, refetch, lastUpdated } = useApi(
    `${API_BASE}/api/weather?lat=${lat}&lon=${lon}`,
    REFRESH_MS,
    [lat, lon],
  )

  const cloudCover = data?.cloud_cover ?? data?.current?.cloud_cover ?? null
  const astroScore = cloudCover !== null ? getAstroScore(cloudCover, moonInfo.fraction) : null

  // Find next good window from forecast
  const nextGood = (() => {
    if (!astroScore || astroScore.score === 'GREAT') return null
    const forecast = data?.forecast || []
    for (const day of forecast) {
      if (day.weather_code <= 2) {
        return formatDay(day.date)
      }
    }
    return null
  })()

  const settings = (
    <div className="flex flex-col gap-2">
      <input
        className="bg-slate-800 text-slate-200 text-xs rounded px-2 py-1 border border-slate-600 outline-none"
        value={cityInput}
        onChange={e => setCityInput(e.target.value)}
        placeholder="City name"
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
        onClick={() => {
          setLat(parseFloat(latInput))
          setLon(parseFloat(lonInput))
          setCity(cityInput)
        }}
      >
        Apply
      </button>
    </div>
  )

  return (
    <CardShell
      title={`Astro Conditions — ${city}`}
      icon="🔭"
      onRemove={onRemove}
      onRefresh={refetch}
      settingsContent={settings}
      lastUpdated={lastUpdated}
      loading={loading}
    >
      {error && <p className="text-red-400 text-xs">{error}</p>}

      {/* Astro score banner */}
      {astroScore && (
        <div className={`rounded-lg p-3 border mb-4 text-center ${astroScore.bg}`}>
          <span className="text-2xl mr-2">{astroScore.emoji}</span>
          <span className={`text-lg font-bold ${astroScore.color}`}>{astroScore.label}</span>
          {nextGood && (
            <p className="text-xs text-slate-400 mt-1">
              Next clear window: <span className="text-slate-200">{nextGood}</span>
            </p>
          )}
        </div>
      )}

      {/* Moon info */}
      <div className="rounded-lg p-3 mb-3" style={{ background: '#252a3c' }}>
        <div className="flex items-center gap-3">
          <span className="text-4xl">{moonInfo.phaseEmoji}</span>
          <div>
            <p className="font-semibold text-slate-200">{moonInfo.phaseName}</p>
            <p className="text-sm text-slate-400">{moonInfo.fraction}% illuminated</p>
            <p className="text-xs text-slate-500">{moonInfo.aboveHorizon ? 'Moon above horizon' : 'Moon below horizon'}</p>
          </div>
        </div>
      </div>

      {/* Sky conditions */}
      {cloudCover !== null && (
        <div className="rounded-lg p-3" style={{ background: '#252a3c' }}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-slate-300">Cloud Cover</span>
            <span className={`text-sm font-semibold ${cloudCover < 20 ? 'text-green-400' : cloudCover < 50 ? 'text-yellow-400' : 'text-red-400'}`}>
              {cloudCover}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-700">
            <div
              className={`h-2 rounded-full transition-all ${cloudCover < 20 ? 'bg-green-500' : cloudCover < 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${cloudCover}%` }}
            />
          </div>
        </div>
      )}

      {loading && !data && <div className="h-24 rounded-lg bg-slate-800/60 animate-pulse mt-3" />}
    </CardShell>
  )
}

function formatDay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}
