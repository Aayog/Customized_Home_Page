import { useState, useEffect, useCallback, useRef } from 'react'

export function useApi(url, intervalMs = null, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const abortRef = useRef(null)

  const fetchData = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(url, { signal: abortRef.current.signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
      setLastUpdated(new Date())
    } catch (e) {
      if (e.name !== 'AbortError') setError(e.message)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, ...deps])

  useEffect(() => {
    fetchData()
    if (intervalMs) {
      const id = setInterval(fetchData, intervalMs)
      return () => clearInterval(id)
    }
  }, [fetchData, intervalMs])

  return { data, loading, error, refetch: fetchData, lastUpdated }
}
