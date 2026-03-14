import React, { useState, useEffect, lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLocation } from '../hooks/useLocation'
import { requestApi } from '../services/api'
import { toast } from 'react-toastify'

const MapView = lazy(() => import('../components/MapView'))

export default function HospitalDashboard() {
  const { user } = useAuth()
  const { location } = useLocation()
  const [myRequests, setMyRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [fulfilling, setFulfilling] = useState(null)

  useEffect(() => { loadRequests() }, [])

  const loadRequests = async () => {
    try {
      const { data } = await requestApi.getMyRequests()
      setMyRequests(data.requests || [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  const handleFulfill = async (id) => {
    setFulfilling(id)
    try {
      await requestApi.fulfill(id, {})
      toast.success('Request marked as fulfilled! ✅')
      await loadRequests()
    } catch { toast.error('Failed to update request') }
    finally { setFulfilling(null) }
  }

  const handleCancel = async (id) => {
    if (!confirm('Cancel this blood request?')) return
    try {
      await requestApi.cancel(id)
      toast.info('Request cancelled')
      await loadRequests()
    } catch { toast.error('Failed to cancel') }
  }

  const getStatusBadge = (status) => ({
    active: 'badge-green', fulfilled: 'badge-blue', expired: 'badge-gray', cancelled: 'badge-gray'
  }[status] || 'badge-gray')

  const getUrgencyBadge = (level) => ({
    critical: 'badge-red', urgent: 'badge-yellow', normal: 'badge-green',
  }[level] || 'badge-gray')

  const stats = {
    total: myRequests.length,
    active: myRequests.filter((r) => r.status === 'active').length,
    fulfilled: myRequests.filter((r) => r.status === 'fulfilled').length,
    totalResponders: myRequests.reduce((acc, r) => acc + (r.respondedDonors?.length || 0), 0),
  }

  return (
    <div className="page-container pt-24 animate-fade-in">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Hospital Dashboard</h1>
          <p className="page-subtitle">{user?.hospitalName || user?.name}</p>
        </div>
        <Link to="/emergency-request" className="btn btn-primary">
          🚨 New Blood Request
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Requests', value: stats.total, color: 'text-white' },
          { label: 'Active', value: stats.active, color: 'text-emerald-400' },
          { label: 'Fulfilled', value: stats.fulfilled, color: 'text-blue-400' },
          { label: 'Donor Responses', value: stats.totalResponders, color: 'text-blood-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card text-center">
            <div className={`text-3xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-slate-400 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Map */}
      {location && myRequests.length > 0 && (
        <div className="mb-8">
          <h2 className="section-title">🗺️ Request Locations</h2>
          <Suspense fallback={<div className="skeleton h-80 rounded-xl" />}>
            <MapView
              requests={myRequests.filter((r) => r.status === 'active')}
              userLocation={location}
              height="320px"
            />
          </Suspense>
        </div>
      )}

      {/* Requests list */}
      <div>
        <h2 className="section-title">📋 My Blood Requests</h2>
        {loading ? (
          <div className="space-y-4">{[1,2,3].map((i) => <div key={i} className="skeleton h-28 rounded-xl" />)}</div>
        ) : myRequests.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-5xl mb-3">🏥</div>
            <p className="text-slate-400">No blood requests yet.</p>
            <Link to="/emergency-request" className="btn btn-primary mt-4">Create First Request</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {myRequests.map((req) => (
              <div key={req._id} className="card hover:border-slate-700 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`badge border text-xs ${getUrgencyBadge(req.urgencyLevel)}`}>
                        {req.urgencyLevel?.toUpperCase()}
                      </span>
                      <span className={`badge text-xs ${getStatusBadge(req.status)}`}>
                        {req.status}
                      </span>
                      <span className="font-bold text-blood-400 text-lg">{req.bloodGroup}</span>
                      <span className="text-slate-400 text-sm">{req.unitsRequired} units</span>
                    </div>
                    <p className="font-semibold text-white">{req.hospitalName}</p>
                    <p className="text-sm text-slate-400 mt-0.5">
                      📞 {req.contactPhone} • Expires: {new Date(req.expiresAt).toLocaleString()}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                      <span>👥 {req.respondedDonors?.length || 0} donor response(s)</span>
                      <span>📢 {req.notificationsSent || 0} notifications sent</span>
                    </div>
                  </div>

                  {req.status === 'active' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleFulfill(req._id)}
                        disabled={fulfilling === req._id}
                        className="btn btn-primary btn-sm"
                      >
                        {fulfilling === req._id ? '...' : '✅ Mark Fulfilled'}
                      </button>
                      <button onClick={() => handleCancel(req._id)} className="btn btn-secondary btn-sm">
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                {/* Donor responses */}
                {req.respondedDonors?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800">
                    <p className="text-xs font-medium text-slate-400 mb-2">Responding Donors:</p>
                    <div className="flex flex-wrap gap-2">
                      {req.respondedDonors.map((r, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 px-2 py-1 bg-slate-800 rounded-lg text-xs">
                          <span className="text-blood-400">{r.donor?.name || 'Donor'}</span>
                          {r.donor?.phone && <a href={`tel:${r.donor.phone}`} className="text-slate-400 hover:text-white">📞</a>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
