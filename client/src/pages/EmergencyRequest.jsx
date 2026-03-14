import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLocation } from '../hooks/useLocation'
import { requestApi } from '../services/api'
import { toast } from 'react-toastify'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export default function EmergencyRequest() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { location } = useLocation()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    bloodGroup: '', unitsRequired: 1, hospitalName: user?.hospitalName || '',
    contactPhone: user?.phone || '', address: '', urgencyLevel: 'urgent',
    description: '', expiresInHours: 24,
    latitude: location?.latitude || '', longitude: location?.longitude || '',
  })

  const set = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }))

  const useMyLocation = () => {
    if (location) {
      setForm((f) => ({ ...f, latitude: location.latitude, longitude: location.longitude }))
      toast.success('Current location set!')
    } else {
      toast.error('Location not available yet')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.latitude || !form.longitude) {
      toast.error('Location is required to find nearby donors'); return
    }
    setLoading(true)
    try {
      const { data } = await requestApi.create({
        ...form,
        unitsRequired: parseInt(form.unitsRequired),
        expiresInHours: parseFloat(form.expiresInHours),
      })
      toast.success('🚨 Emergency request created! Donors are being notified.')
      navigate(`/requests/${data.request._id}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container pt-24 max-w-2xl animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">🚨</span>
          <h1 className="page-title">Emergency Blood Request</h1>
        </div>
        <p className="page-subtitle">
          Submit an emergency request. Nearby compatible donors will be instantly notified via push notifications.
        </p>
      </div>

      {/* Urgency quick-set */}
      <div className="flex gap-3 mb-6">
        {['normal', 'urgent', 'critical'].map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => setForm((f) => ({ ...f, urgencyLevel: level }))}
            className={`flex-1 py-3 rounded-xl border font-semibold text-sm capitalize transition-all ${
              form.urgencyLevel === level
                ? level === 'critical'
                  ? 'bg-red-900/60 border-red-700 text-red-300'
                  : level === 'urgent'
                  ? 'bg-amber-900/60 border-amber-700 text-amber-300'
                  : 'bg-emerald-900/60 border-emerald-700 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
            }`}
          >
            {level === 'critical' ? '🔴' : level === 'urgent' ? '🟡' : '🟢'} {level}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="card space-y-4">
          <h2 className="font-semibold text-white">Blood Requirements</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="input-label">Blood Group *</label>
              <select className="input" value={form.bloodGroup} onChange={set('bloodGroup')} required>
                <option value="">Select</option>
                {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="input-label">Units Required *</label>
              <input className="input" type="number" min="1" max="20" value={form.unitsRequired} onChange={set('unitsRequired')} required />
            </div>
          </div>

          <div className="form-group">
            <label className="input-label">Expires In</label>
            <select className="input" value={form.expiresInHours} onChange={set('expiresInHours')}>
              <option value={3}>3 hours</option>
              <option value={6}>6 hours</option>
              <option value={12}>12 hours</option>
              <option value={24}>24 hours</option>
              <option value={48}>48 hours</option>
            </select>
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold text-white">Hospital Details</h2>

          <div className="form-group">
            <label className="input-label">Hospital Name *</label>
            <input className="input" placeholder="City Hospital, Ward 5" value={form.hospitalName} onChange={set('hospitalName')} required />
          </div>
          <div className="form-group">
            <label className="input-label">Contact Phone *</label>
            <input className="input" type="tel" placeholder="+91 9999999999" value={form.contactPhone} onChange={set('contactPhone')} required />
          </div>
          <div className="form-group">
            <label className="input-label">Address</label>
            <input className="input" placeholder="Street, City" value={form.address} onChange={set('address')} />
          </div>
          <div className="form-group">
            <label className="input-label">Additional Notes</label>
            <textarea className="input resize-none" rows={2} placeholder="Patient condition, ward number, etc." value={form.description} onChange={set('description')} />
          </div>
        </div>

        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">📍 Location *</h2>
            <button type="button" onClick={useMyLocation} className="btn btn-secondary btn-sm">
              📍 Use My Location
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="input-label">Latitude</label>
              <input className="input" type="number" step="any" placeholder="e.g. 19.0760" value={form.latitude} onChange={set('latitude')} required />
            </div>
            <div className="form-group">
              <label className="input-label">Longitude</label>
              <input className="input" type="number" step="any" placeholder="e.g. 72.8777" value={form.longitude} onChange={set('longitude')} required />
            </div>
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary w-full btn-lg">
          {loading ? (
            <span className="flex items-center gap-2 justify-center">
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Submitting & Notifying Donors...
            </span>
          ) : '🚨 Submit Emergency Request'}
        </button>
      </form>
    </div>
  )
}
