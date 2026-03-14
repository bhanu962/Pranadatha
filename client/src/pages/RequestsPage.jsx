import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { requestApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-toastify'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const URGENCY_STYLES = {
  critical: 'border-red-800 bg-red-950/40 text-red-300',
  urgent: 'border-amber-800 bg-amber-950/40 text-amber-300',
  normal: 'border-emerald-800 bg-emerald-950/30 text-emerald-300',
}

export default function RequestsPage() {
  const { user, isAuthenticated } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ bloodGroup: '', urgency: '', status: 'active' })
  const [responding, setResponding] = useState(null)

  useEffect(() => { loadRequests() }, [filters.status])

  const loadRequests = async () => {
    setLoading(true)
    try {
      const { data } = await requestApi.getAll({ status: filters.status, limit: 50 })
      setRequests(data.requests || [])
    } catch { toast.error('Failed to load requests') }
    finally { setLoading(false) }
  }

  const handleRespond = async (id) => {
    setResponding(id)
    try {
      await requestApi.respond(id)
      toast.success('✅ You responded to this request! The hospital will contact you.')
      await loadRequests()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to respond')
    } finally { setResponding(null) }
  }

  const filtered = requests.filter((r) => {
    if (filters.bloodGroup && r.bloodGroup !== filters.bloodGroup) return false
    if (filters.urgency && r.urgencyLevel !== filters.urgency) return false
    return true
  })

  const timeLeft = (expiresAt) => {
    const diff = new Date(expiresAt) - Date.now()
    if (diff <= 0) return 'Expired'
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    return h > 0 ? `${h}h ${m}m left` : `${m}m left`
  }

  const hasResponded = (req) =>
    req.respondedDonors?.some((r) => r.donor?._id === user?._id || r.donor === user?._id)

  return (
    <div className="page-container pt-24 animate-fade-in">
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">🚨 Blood Requests</h1>
          <p className="page-subtitle">{filtered.length} active request{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        {isAuthenticated && (user?.role === 'hospital' || user?.role === 'patient' || user?.role === 'admin') && (
          <Link to="/emergency-request" className="btn btn-primary">🚨 New Request</Link>
        )}
      </div>

      {/* Filters */}
      <div className="card mb-6 flex flex-wrap gap-3">
        <select className="input w-40" value={filters.bloodGroup}
          onChange={(e) => setFilters({ ...filters, bloodGroup: e.target.value })}>
          <option value="">All Blood Groups</option>
          {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select className="input w-36" value={filters.urgency}
          onChange={(e) => setFilters({ ...filters, urgency: e.target.value })}>
          <option value="">All Urgency</option>
          <option value="critical">🔴 Critical</option>
          <option value="urgent">🟡 Urgent</option>
          <option value="normal">🟢 Normal</option>
        </select>
        <select className="input w-36" value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="active">Active</option>
          <option value="fulfilled">Fulfilled</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-4">{[1,2,3,4].map((i) => <div key={i} className="skeleton h-32 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-14">
          <div className="text-5xl mb-3">🏥</div>
          <p className="text-slate-400">No blood requests found.</p>
          <Link to="/emergency-request" className="btn btn-primary mt-4">Create Request</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((req) => {
            const alreadyResponded = hasResponded(req)
            return (
              <div key={req._id} className={`card border transition-colors hover:border-slate-700 ${URGENCY_STYLES[req.urgencyLevel] || ''}`}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={`badge border text-xs font-bold uppercase ${
                        req.urgencyLevel === 'critical' ? 'border-red-700 text-red-300 bg-red-950/60' :
                        req.urgencyLevel === 'urgent' ? 'border-amber-700 text-amber-300 bg-amber-950/60' :
                        'border-emerald-700 text-emerald-300 bg-emerald-950/60'
                      }`}>
                        {req.urgencyLevel === 'critical' ? '🔴' : req.urgencyLevel === 'urgent' ? '🟡' : '🟢'} {req.urgencyLevel}
                      </span>
                      <span className="text-2xl font-extrabold text-blood-400">{req.bloodGroup}</span>
                      <span className="text-slate-300 font-medium">{req.unitsRequired} unit{req.unitsRequired !== 1 ? 's' : ''} needed</span>
                      <span className={`badge text-xs ${req.status === 'fulfilled' ? 'badge-blue' : req.status === 'active' ? 'badge-green' : 'badge-gray'}`}>
                        {req.status}
                      </span>
                    </div>

                    <h3 className="font-semibold text-white text-lg">{req.hospitalName}</h3>
                    {req.address && <p className="text-sm text-slate-400 mt-0.5">📍 {req.address}</p>}
                    {req.patientName && <p className="text-sm text-slate-400">👤 Patient: {req.patientName}</p>}
                    {req.description && <p className="text-sm text-slate-500 mt-1 italic">{req.description}</p>}

                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                      <span>📞 <a href={`tel:${req.contactPhone}`} className="text-blood-400 hover:underline">{req.contactPhone}</a></span>
                      <span>⏳ {timeLeft(req.expiresAt)}</span>
                      <span>👥 {req.respondedDonors?.length || 0} responded</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:items-end gap-2 flex-shrink-0">
                    <Link to={`/requests/${req._id}`} className="btn btn-secondary btn-sm whitespace-nowrap">
                      View Details →
                    </Link>
                    {isAuthenticated && user?.role === 'donor' && req.status === 'active' && (
                      alreadyResponded ? (
                        <span className="badge badge-green text-xs">✅ You responded</span>
                      ) : (
                        <button
                          onClick={() => handleRespond(req._id)}
                          disabled={responding === req._id}
                          className="btn btn-primary btn-sm"
                        >
                          {responding === req._id ? '...' : '🩸 I Can Donate'}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
