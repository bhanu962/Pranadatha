import React, { useState, useEffect, lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { donorApi, requestApi } from '../services/api'
import { useLocation } from '../hooks/useLocation'
import { useAuth } from '../context/AuthContext'
import DonorCard from '../components/DonorCard'

const MapView = lazy(() => import('../components/MapView'))

const STATS = [
  { label: 'Active Donors', icon: '🩸', value: '10,000+', color: 'text-blood-400' },
  { label: 'Lives Saved', icon: '❤️', value: '50,000+', color: 'text-rose-400' },
  { label: 'Cities Covered', icon: '🏙️', value: '200+', color: 'text-blue-400' },
  { label: 'Hospitals', icon: '🏥', value: '500+', color: 'text-emerald-400' },
]

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export default function Home() {
  const { isAuthenticated, user } = useAuth()
  const { location } = useLocation()
  const [nearbyDonors, setNearbyDonors] = useState([])
  const [nearbyRequests, setNearbyRequests] = useState([])
  const [searchGroup, setSearchGroup] = useState('')
  const [searchRadius, setSearchRadius] = useState(10)
  const [searchLoading, setSearchLoading] = useState(false)

  useEffect(() => {
    if (location) {
      loadNearbyData()
    }
  }, [location])

  const loadNearbyData = async () => {
    if (!location) return
    try {
      const [donorRes, reqRes] = await Promise.allSettled([
        donorApi.search({ latitude: location.latitude, longitude: location.longitude, radius: 10 }),
        requestApi.getNearby({ latitude: location.latitude, longitude: location.longitude, radius: 25 }),
      ])
      if (donorRes.status === 'fulfilled') setNearbyDonors(donorRes.value.data.donors?.slice(0, 6) || [])
      if (reqRes.status === 'fulfilled') setNearbyRequests(reqRes.value.data.requests?.slice(0, 4) || [])
    } catch (e) { /* ignore */ }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchGroup || !location) return
    setSearchLoading(true)
    try {
      const { data } = await donorApi.search({
        bloodGroup: searchGroup,
        latitude: location.latitude,
        longitude: location.longitude,
        radius: searchRadius,
      })
      setNearbyDonors(data.donors || [])
    } catch { /* ignore */ }
    finally { setSearchLoading(false) }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* ── Hero ── */}
      <section className="relative pt-24 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blood-950 rounded-full blur-3xl opacity-60" />
          <div className="absolute top-40 right-1/4 w-48 h-48 bg-rose-950 rounded-full blur-2xl opacity-40" />
        </div>
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm text-blood-300 mb-6 border border-blood-900/50">
            <span className="w-2 h-2 bg-blood-500 rounded-full animate-pulse" />
            Emergency blood requests are active nearby
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-white leading-tight">
            Save Lives with
            <span className="gradient-text block">Every Drop</span>
          </h1>
          <p className="mt-6 text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Connect blood donors with patients in emergencies — instantly, locally, and without barriers.
            Powered by real-time push notifications and location-based matching.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-10">
            {isAuthenticated ? (
              <>
                <Link to="/emergency-request" className="btn btn-primary btn-lg">🚨 Emergency Request</Link>
                <Link to={user?.role === 'donor' ? '/donor-dashboard' : '/dashboard'} className="btn btn-secondary btn-lg">
                  📊 My Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary btn-lg">🩸 Become a Donor</Link>
                <Link to="/donors" className="btn btn-secondary btn-lg">Find Donors →</Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map(({ label, icon, value, color }) => (
            <div key={label} className="card text-center hover:border-slate-700 transition-colors">
              <div className="text-3xl mb-1">{icon}</div>
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-sm text-slate-400 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Search ── */}
      <section className="py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="section-title text-center">🔍 Find Donors Near You</h2>
          <form onSubmit={handleSearch} className="card">
            <div className="flex flex-col sm:flex-row gap-3">
              <select className="input flex-1" value={searchGroup} onChange={(e) => setSearchGroup(e.target.value)} required>
                <option value="">Select blood group</option>
                {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              <select className="input w-full sm:w-36" value={searchRadius} onChange={(e) => setSearchRadius(e.target.value)}>
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={25}>25 km</option>
              </select>
              <button type="submit" disabled={searchLoading || !location} className="btn btn-primary whitespace-nowrap">
                {searchLoading ? 'Searching...' : '🔍 Search'}
              </button>
            </div>
            {!location && <p className="text-xs text-amber-400 mt-2">⚠️ Enable location access for nearby search</p>}
          </form>
        </div>
      </section>

      {/* ── Map ── */}
      {location && (
        <section className="py-6 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="section-title">🗺️ Live Map</h2>
            <Suspense fallback={<div className="skeleton h-96 rounded-xl" />}>
              <MapView
                donors={nearbyDonors}
                requests={nearbyRequests}
                userLocation={location}
                radius={searchRadius}
                height="450px"
              />
            </Suspense>
          </div>
        </section>
      )}

      {/* ── Nearby Donors ── */}
      {nearbyDonors.length > 0 && (
        <section className="py-10 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="section-title mb-0">🩸 Nearby Donors</h2>
              <Link to="/donors" className="text-sm text-blood-400 hover:text-blood-300">View all →</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {nearbyDonors.map((d) => <DonorCard key={d._id} donor={d} showDistance />)}
            </div>
          </div>
        </section>
      )}

      {/* ── Active Requests ── */}
      {nearbyRequests.length > 0 && (
        <section className="py-10 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="section-title mb-0">🚨 Active Requests Nearby</h2>
              <Link to="/requests" className="text-sm text-blood-400 hover:text-blood-300">View all →</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {nearbyRequests.map((req) => (
                <Link key={req._id} to={`/requests/${req._id}`} className="card-hover block">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`badge border text-xs ${
                          req.urgencyLevel === 'critical' ? 'urgency-critical' : req.urgencyLevel === 'urgent' ? 'urgency-urgent' : 'urgency-normal'
                        }`}>
                          {req.urgencyLevel?.toUpperCase()}
                        </span>
                        <span className="font-bold text-blood-400 text-lg">{req.bloodGroup}</span>
                      </div>
                      <p className="font-semibold text-white mt-1">{req.hospitalName}</p>
                      <p className="text-sm text-slate-400">{req.unitsRequired} units needed</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-slate-500">Expires</p>
                      <p className="text-xs text-amber-400">{new Date(req.expiresAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="card border-blood-900 bg-gradient-to-br from-blood-950/60 to-slate-900">
            <h2 className="text-3xl font-bold text-white">Ready to Save a Life?</h2>
            <p className="text-slate-400 mt-3 mb-8">One donation can save up to 3 lives. Register as a donor today.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/register" className="btn btn-primary btn-lg">🩸 Register as Donor</Link>
              <Link to="/camps" className="btn btn-outline btn-lg">🎪 Find Donation Camps</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
