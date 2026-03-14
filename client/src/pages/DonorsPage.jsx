import React, { useState, useEffect, lazy, Suspense } from 'react'
import { useSearchParams } from 'react-router-dom'
import { donorApi } from '../services/api'
import { useLocation } from '../hooks/useLocation'
import DonorCard from '../components/DonorCard'
import { toast } from 'react-toastify'

const MapView = lazy(() => import('../components/MapView'))

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export default function DonorsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { location } = useLocation()
  const [donors, setDonors] = useState([])
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState('grid') // grid | map
  const [total, setTotal] = useState(0)

  const [filters, setFilters] = useState({
    bloodGroup: searchParams.get('bloodGroup') || '',
    city: searchParams.get('city') || '',
    radius: searchParams.get('radius') || '25',
    available: searchParams.get('available') || 'true',
    page: 1,
  })

  useEffect(() => { search() }, [])

  const search = async (params = filters) => {
    setLoading(true)
    try {
      const query = { ...params }
      if (location) {
        query.latitude = location.latitude
        query.longitude = location.longitude
      }
      if (!query.bloodGroup) delete query.bloodGroup
      if (!query.city) delete query.city
      const { data } = await donorApi.search(query)
      setDonors(data.donors || [])
      setTotal(data.total || 0)
    } catch {
      toast.error('Failed to load donors')
    } finally {
      setLoading(false)
    }
  }

  const setFilter = (key, val) => {
    const updated = { ...filters, [key]: val, page: 1 }
    setFilters(updated)
    setSearchParams(Object.fromEntries(Object.entries(updated).filter(([, v]) => v)))
  }

  const handleSearch = (e) => {
    e.preventDefault()
    search(filters)
  }

  return (
    <div className="page-container pt-24 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">🔍 Find Blood Donors</h1>
        <p className="page-subtitle">
          {total > 0 ? `${total} donor${total !== 1 ? 's' : ''} found` : 'Search for donors near you'}
        </p>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch} className="card mb-6">
        <div className="flex flex-wrap gap-3">
          <select
            className="input flex-1 min-w-[140px]"
            value={filters.bloodGroup}
            onChange={(e) => setFilter('bloodGroup', e.target.value)}
          >
            <option value="">All Blood Groups</option>
            {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>

          <input
            className="input flex-1 min-w-[140px]"
            placeholder="City (e.g. Mumbai)"
            value={filters.city}
            onChange={(e) => setFilter('city', e.target.value)}
          />

          <select
            className="input w-36"
            value={filters.radius}
            onChange={(e) => setFilter('radius', e.target.value)}
          >
            <option value="5">5 km</option>
            <option value="10">10 km</option>
            <option value="25">25 km</option>
            <option value="50">50 km</option>
            <option value="100">100 km</option>
          </select>

          <select
            className="input w-40"
            value={filters.available}
            onChange={(e) => setFilter('available', e.target.value)}
          >
            <option value="true">Available only</option>
            <option value="">All donors</option>
          </select>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Searching...' : '🔍 Search'}
          </button>
        </div>
        {!location && (
          <p className="text-xs text-amber-400 mt-2">
            ⚠️ Enable location for nearby search. Or filter by city above.
          </p>
        )}
      </form>

      {/* View toggle */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-400">{total} result{total !== 1 ? 's' : ''}</p>
        <div className="flex gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-4 py-1.5 rounded-md text-sm transition-all ${viewMode === 'grid' ? 'bg-blood-700 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            ⊞ Grid
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-4 py-1.5 rounded-md text-sm transition-all ${viewMode === 'map' ? 'bg-blood-700 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            🗺️ Map
          </button>
        </div>
      </div>

      {/* Map view */}
      {viewMode === 'map' && (
        <div className="mb-6">
          <Suspense fallback={<div className="skeleton h-96 rounded-xl" />}>
            <MapView
              donors={donors}
              userLocation={location}
              radius={parseInt(filters.radius)}
              height="480px"
            />
          </Suspense>
        </div>
      )}

      {/* Grid view */}
      {viewMode === 'grid' && (
        loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map((i) => <div key={i} className="skeleton h-44 rounded-xl" />)}
          </div>
        ) : donors.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-5xl mb-3">🩸</div>
            <p className="text-slate-400">No donors found. Try expanding your search radius or changing city.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {donors.map((d) => (
              <DonorCard key={d._id} donor={d} showDistance showContact />
            ))}
          </div>
        )
      )}
    </div>
  )
}
