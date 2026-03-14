import { useState, useEffect, useCallback } from 'react'

/**
 * Hook to get and watch the user's geolocation
 */
export const useLocation = (options = {}) => {
  const [location, setLocation] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      return
    }
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        })
        setError(null)
        setLoading(false)
      },
      (err) => {
        const messages = {
          1: 'Location access denied. Please enable location in browser settings.',
          2: 'Location unavailable. Check your device settings.',
          3: 'Location request timed out.',
        }
        setError(messages[err.code] || 'Failed to get location.')
        setLoading(false)
      },
      { timeout: 10000, maximumAge: 60000, enableHighAccuracy: true, ...options }
    )
  }, [])

  useEffect(() => { getLocation() }, [getLocation])

  return { location, error, loading, refresh: getLocation }
}
