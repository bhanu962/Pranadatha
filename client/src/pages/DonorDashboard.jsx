import React, { useState, useEffect, lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLocation } from '../hooks/useLocation'
import { useNotification } from '../hooks/useNotification'
import { donorApi, requestApi } from '../services/api'
import { checkEligibility } from '../utils/eligibility'
import { toast } from 'react-toastify'
import DonorCard from '../components/DonorCard'

const MapView = lazy(() => import('../components/MapView'))

const LEVEL_COLORS = { gold: 'text-yellow-400', silver: 'text-slate-300', bronze: 'text-amber-700' }
const LEVEL_ICONS = { gold: '🥇', silver: '🥈', bronze: '🥉' }

export default function DonorDashboard() {
  const { user, updateUser } = useAuth()
  const { location, error: locError } = useLocation()
  const { isSubscribed, subscribe } = useNotification()
  const [donations, setDonations] = useState([])
  const [nearbyRequests, setNearbyRequests] = useState([])
  const [toggling, setToggling] = useState(false)
  const [loading, setLoading] = useState(true)

  const eligibility = user ? checkEligibility(user) : null

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (location) loadNearby()
  }, [location])

  const loadData = async () => {
    try {
      const { data } = await donorApi.getDonationHistory()
      setDonations(data.donations || [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  const loadNearby = async () => {
    try {
      const { data } = await requestApi.getNearby({
        latitude: location.latitude,
        longitude: location.longitude,
        radius: 25,
      })
      setNearbyRequests(data.requests || [])
    } catch { /* ignore */ }
  }

  const toggleAvailability = async () => {
    setToggling(true)
    try {
      const { data } = await donorApi.toggleAvailability()
      updateUser({ ...user, isAvailable: data.isAvailable })
      toast.success(data.message)
    } catch { toast.error('Failed to toggle availability') }
    finally { setToggling(false) }
  }

  const getUrgencyClass = (level) => ({
    critical: 'badge-red', urgent: 'badge-yellow', normal: 'badge-green',
  }[level] || 'badge-gray')

  return (
    <div className="page-container pt-24 animate-fade-in">
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Donor Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.name}! 👋</p>
        </div>
        <div className="flex items-center gap-3">
          {!isSubscribed && (
            <button onClick={subscribe} className="btn btn-secondary btn-sm">
              🔔 Enable Alerts
            </button>
          )}
          <button
            onClick={toggleAvailability}
            disabled={toggling}
            className={`btn ${user?.isAvailable ? 'btn-secondary' : 'btn-primary'}`}
          >
            {toggling ? '...' : user?.isAvailable ? '⛔ Go Unavailable' : '✅ Go Available'}
          </button>
        </div>
      </div>

      {/* Profile Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {/* Blood Group */}
        <div className="card text-center">
          <div className="text-4xl font-extrabold gradient-text">{user?.bloodGroup || 'N/A'}</div>
          <div className="text-xs text-slate-400 mt-1">Blood Group</div>
        </div>
        {/* Donations */}
        <div className="card text-center">
          <div className="text-4xl font-extrabold text-blood-400">{user?.totalDonations || 0}</div>
          <div className="text-xs text-slate-400 mt-1">Total Donations</div>
        </div>
        {/* Level */}
        <div className="card text-center">
          <div className={`text-3xl font-bold ${LEVEL_COLORS[user?.donorLevel] || 'text-amber-700'}`}>
            {LEVEL_ICONS[user?.donorLevel] || '🥉'}
          </div>
          <div className="text-xs text-slate-400 mt-1 capitalize">{user?.donorLevel || 'Bronze'} Donor</div>
        </div>
        {/* Status */}
        <div className="card text-center">
          {eligibility?.eligible ? (
            <>
              <div className="text-3xl">✅</div>
              <div className="text-xs text-emerald-400 mt-1 font-medium">Eligible to Donate</div>
            </>
          ) : (
            <>
              <div className="text-3xl">⏳</div>
              <div className="text-xs text-amber-400 mt-1 font-medium">
                {eligibility?.daysUntilEligible}d remaining
              </div>
            </>
          )}
        </div>
      </div>

      {/* Eligibility banner */}
      {eligibility && !eligibility.eligible && (
        <div className="mb-6 p-4 rounded-xl bg-amber-950/50 border border-amber-800 text-amber-300 text-sm">
          ⏳ {eligibility.reason}
        </div>
      )}

      {/* Location warning */}
      {locError && (
        <div className="mb-6 p-4 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 text-sm">
          📍 {locError} — Enable location to see nearby emergency requests.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Nearby requests + Map */}
        <div className="lg:col-span-2 space-y-6">
          {/* Nearby Emergency Requests */}
          <div className="card">
            <h2 className="section-title">🚨 Emergency Requests Near You</h2>
            {nearbyRequests.length === 0 ? (
              <p className="text-slate-400 text-sm">No active requests nearby. {!location && 'Enable location to see local requests.'}</p>
            ) : (
              <div className="space-y-3">
                {nearbyRequests.map((req) => (
                  <div key={req._id} className="flex items-start justify-between gap-4 p-3 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-blood-800 transition-colors">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`badge border text-xs ${getUrgencyClass(req.urgencyLevel)}`}>
                          {req.urgencyLevel?.toUpperCase()}
                        </span>
                        <span className="font-bold text-blood-400">{req.bloodGroup}</span>
                        <span className="text-slate-400 text-sm">{req.unitsRequired} units</span>
                      </div>
                      <p className="text-white font-medium mt-1">{req.hospitalName}</p>
                      <p className="text-slate-400 text-xs mt-0.5">{req.contactPhone}</p>
                    </div>
                    <Link to={`/requests/${req._id}`} className="btn btn-primary btn-sm flex-shrink-0">
                      Respond
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Map */}
          {location && (
            <div>
              <h2 className="section-title">🗺️ Nearby Map</h2>
              <Suspense fallback={<div className="skeleton h-80 rounded-xl" />}>
                <MapView
                  requests={nearbyRequests}
                  userLocation={location}
                  radius={25}
                  height="320px"
                />
              </Suspense>
            </div>
          )}
        </div>

        {/* Right: Donation History */}
        <div className="card">
          <h2 className="section-title">💉 Donation History</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="skeleton h-16 rounded-lg" />)}
            </div>
          ) : donations.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-3">🩸</div>
              <p className="text-slate-400 text-sm">No donations yet.</p>
              <Link to="/camps" className="btn btn-primary btn-sm mt-4">Find a Camp</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {donations.map((d) => (
                <div key={d._id} className="p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-blood-400">{d.bloodGroup}</span>
                    <span className="text-xs text-slate-400">{new Date(d.donationDate).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-slate-300 mt-0.5">{d.hospitalName || d.camp?.title || 'Voluntary'}</p>
                  <span className={`badge text-xs mt-1 ${d.verified ? 'badge-green' : 'badge-gray'}`}>
                    {d.verified ? '✅ Verified' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
