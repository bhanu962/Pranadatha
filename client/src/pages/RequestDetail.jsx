import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { requestApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-toastify'

const URGENCY_COLORS = {
  critical: 'text-red-400 border-red-800 bg-red-950/40',
  urgent: 'text-amber-400 border-amber-800 bg-amber-950/40',
  normal: 'text-emerald-400 border-emerald-800 bg-emerald-950/30',
}

export default function RequestDetail() {
  const { id } = useParams()
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState(false)
  const [fulfilling, setFulfilling] = useState(false)

  useEffect(() => { loadRequest() }, [id])

  const loadRequest = async () => {
    try {
      const { data } = await requestApi.getById(id)
      setRequest(data.request)
    } catch { toast.error('Request not found') }
    finally { setLoading(false) }
  }

  const hasResponded = request?.respondedDonors?.some(
    (r) => r.donor?._id === user?._id || r.donor === user?._id
  )

  const handleRespond = async () => {
    setResponding(true)
    try {
      await requestApi.respond(id)
      toast.success('✅ You responded! The hospital will contact you.')
      await loadRequest()
    } catch (e) { toast.error(e.response?.data?.message || 'Failed') }
    finally { setResponding(false) }
  }

  const handleFulfill = async () => {
    setFulfilling(true)
    try {
      await requestApi.fulfill(id, {})
      toast.success('Request marked as fulfilled!')
      await loadRequest()
    } catch { toast.error('Failed to update') }
    finally { setFulfilling(false) }
  }

  const handleCancel = async () => {
    if (!confirm('Cancel this request?')) return
    try {
      await requestApi.cancel(id)
      toast.info('Request cancelled')
      navigate('/requests')
    } catch { toast.error('Failed to cancel') }
  }

  const timeLeft = (expiresAt) => {
    const diff = new Date(expiresAt) - Date.now()
    if (diff <= 0) return 'Expired'
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    return h > 0 ? `${h}h ${m}m remaining` : `${m}m remaining`
  }

  if (loading) return (
    <div className="page-container pt-24">
      <div className="skeleton h-96 rounded-xl" />
    </div>
  )

  if (!request) return (
    <div className="page-container pt-24 text-center">
      <div className="text-5xl mb-4">🔍</div>
      <p className="text-slate-400">Request not found.</p>
      <Link to="/requests" className="btn btn-secondary mt-4">← Back to Requests</Link>
    </div>
  )

  const urgencyStyle = URGENCY_COLORS[request.urgencyLevel] || ''
  const isOwner = request.requestedBy?._id === user?._id || request.requestedBy === user?._id
  const canManage = isOwner || user?.role === 'admin'

  return (
    <div className="page-container pt-24 max-w-2xl animate-fade-in">
      <Link to="/requests" className="text-sm text-slate-400 hover:text-white mb-6 inline-flex items-center gap-1">
        ← Back to Requests
      </Link>

      {/* Main card */}
      <div className={`card border mb-4 ${urgencyStyle}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={`badge border text-xs uppercase font-bold ${urgencyStyle}`}>
                {request.urgencyLevel === 'critical' ? '🔴' : request.urgencyLevel === 'urgent' ? '🟡' : '🟢'} {request.urgencyLevel}
              </span>
              <span className={`badge text-xs ${request.status === 'active' ? 'badge-green' : 'badge-gray'}`}>
                {request.status}
              </span>
            </div>
            <h1 className="text-4xl font-extrabold text-blood-400">{request.bloodGroup}</h1>
            <p className="text-white font-semibold text-xl mt-1">{request.hospitalName}</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-black text-white">{request.unitsRequired}</div>
            <div className="text-xs text-slate-400">units needed</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {request.address && <Detail label="📍 Address" value={request.address} />}
          {request.patientName && <Detail label="👤 Patient" value={request.patientName} />}
          <Detail label="📞 Contact" value={
            <a href={`tel:${request.contactPhone}`} className="text-blood-400 hover:underline">
              {request.contactPhone}
            </a>
          } />
          <Detail label="⏳ Expires" value={timeLeft(request.expiresAt)} />
          <Detail label="📢 Notified" value={`${request.notificationsSent || 0} donors`} />
          <Detail label="👥 Responded" value={`${request.respondedDonors?.length || 0} donors`} />
        </div>

        {request.description && (
          <div className="mt-4 p-3 rounded-xl bg-slate-800/60 text-sm text-slate-300">
            {request.description}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        {isAuthenticated && user?.role === 'donor' && request.status === 'active' && (
          hasResponded ? (
            <div className="badge badge-green px-4 py-2 text-sm">✅ You responded — hospital will call you</div>
          ) : (
            <button onClick={handleRespond} disabled={responding} className="btn btn-primary btn-lg">
              {responding ? 'Submitting...' : '🩸 I Can Donate'}
            </button>
          )
        )}

        {canManage && request.status === 'active' && (
          <>
            <button onClick={handleFulfill} disabled={fulfilling} className="btn btn-secondary">
              {fulfilling ? '...' : '✅ Mark Fulfilled'}
            </button>
            <button onClick={handleCancel} className="btn btn-danger">Cancel Request</button>
          </>
        )}

        <a href={`tel:${request.contactPhone}`} className="btn btn-outline">
          📞 Call Hospital
        </a>
      </div>

      {/* Responding donors list */}
      {canManage && request.respondedDonors?.length > 0 && (
        <div className="card">
          <h2 className="section-title">👥 Donors Who Responded ({request.respondedDonors.length})</h2>
          <div className="space-y-2">
            {request.respondedDonors.map((r, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blood-900 flex items-center justify-center text-blood-300 font-bold text-sm">
                    {r.donor?.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="font-medium text-white text-sm">{r.donor?.name || 'Donor'}</p>
                    <p className="text-xs text-slate-400">
                      {r.donor?.bloodGroup} · {r.donor?.city}
                      {r.respondedAt && ` · ${new Date(r.respondedAt).toLocaleString()}`}
                    </p>
                  </div>
                </div>
                {r.donor?.phone && (
                  <a href={`tel:${r.donor.phone}`} className="btn btn-primary btn-sm">📞 Call</a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const Detail = ({ label, value }) => (
  <div>
    <p className="text-xs text-slate-500 mb-0.5">{label}</p>
    <p className="text-slate-200 font-medium">{value}</p>
  </div>
)
