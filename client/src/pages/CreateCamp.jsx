import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { campApi } from '../services/api'
import { toast } from 'react-toastify'

const BLOOD_GROUPS = ['All', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export default function CreateCamp() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    address: '',
    city: '',
    latitude: '',
    longitude: '',
    startDate: '',
    endDate: '',
    bloodGroupsNeeded: ['All'],
    expectedDonors: 50,
    contactPhone: '',
    contactEmail: '',
  })

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const toggleBloodGroup = (group) => {
    const current = form.bloodGroupsNeeded
    if (group === 'All') {
      setForm({ ...form, bloodGroupsNeeded: ['All'] })
      return
    }
    const without = current.filter((g) => g !== 'All' && g !== group)
    if (current.includes(group)) {
      setForm({ ...form, bloodGroupsNeeded: without.length ? without : ['All'] })
    } else {
      setForm({ ...form, bloodGroupsNeeded: [...without, group] })
    }
  }

  const getLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return }
    toast.info('Getting your location...')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, latitude: pos.coords.latitude, longitude: pos.coords.longitude }))
        toast.success('Location set!')
      },
      () => toast.error('Could not get location. Enter manually.')
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.latitude || !form.longitude) {
      toast.error('Location is required. Click 📍 to auto-detect or enter manually.')
      return
    }
    if (new Date(form.endDate) <= new Date(form.startDate)) {
      toast.error('End date must be after start date.')
      return
    }
    setLoading(true)
    try {
      const { data } = await campApi.create(form)
      toast.success('🎪 Camp created successfully!')
      navigate('/camps')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create camp')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container pt-24 max-w-2xl animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">🎪 Create Donation Camp</h1>
        <p className="page-subtitle">Organize a blood donation event in your area</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="card space-y-4">
          <h2 className="section-title">Basic Information</h2>

          <div className="form-group">
            <label className="input-label">Camp Title *</label>
            <input className="input" placeholder="e.g. Apollo Blood Drive 2026"
              value={form.title} onChange={set('title')} required />
          </div>

          <div className="form-group">
            <label className="input-label">Description</label>
            <textarea className="input min-h-[80px] resize-y" placeholder="Describe the camp, what to bring, who to contact..."
              value={form.description} onChange={set('description')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="input-label">Start Date & Time *</label>
              <input className="input" type="datetime-local"
                value={form.startDate} onChange={set('startDate')} required />
            </div>
            <div className="form-group">
              <label className="input-label">End Date & Time *</label>
              <input className="input" type="datetime-local"
                value={form.endDate} onChange={set('endDate')} required />
            </div>
          </div>

          <div className="form-group">
            <label className="input-label">Expected Donors</label>
            <input className="input" type="number" min="1" max="10000" placeholder="50"
              value={form.expectedDonors} onChange={set('expectedDonors')} />
          </div>
        </div>

        {/* Location */}
        <div className="card space-y-4">
          <h2 className="section-title">Location</h2>

          <div className="form-group">
            <label className="input-label">Address *</label>
            <input className="input" placeholder="123 Main Street, Near Landmark"
              value={form.address} onChange={set('address')} required />
          </div>

          <div className="form-group">
            <label className="input-label">City *</label>
            <input className="input" placeholder="Mumbai"
              value={form.city} onChange={set('city')} required />
          </div>

          <div>
            <label className="input-label">GPS Coordinates (for map display) *</label>
            <div className="flex gap-2">
              <input className="input flex-1" type="number" step="any" placeholder="Latitude"
                value={form.latitude} onChange={set('latitude')} required />
              <input className="input flex-1" type="number" step="any" placeholder="Longitude"
                value={form.longitude} onChange={set('longitude')} required />
              <button type="button" onClick={getLocation} className="btn btn-secondary px-3" title="Auto-detect">📍</button>
            </div>
          </div>
        </div>

        {/* Blood Groups */}
        <div className="card">
          <h2 className="section-title mb-3">Blood Groups Needed</h2>
          <div className="flex flex-wrap gap-2">
            {BLOOD_GROUPS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => toggleBloodGroup(g)}
                className={`btn btn-sm rounded-xl transition-all ${
                  form.bloodGroupsNeeded.includes(g)
                    ? 'btn-primary'
                    : 'btn-secondary opacity-60'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="card space-y-4">
          <h2 className="section-title">Contact Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="form-group">
              <label className="input-label">Contact Phone</label>
              <input className="input" type="tel" placeholder="+91 9999999999"
                value={form.contactPhone} onChange={set('contactPhone')} />
            </div>
            <div className="form-group">
              <label className="input-label">Contact Email</label>
              <input className="input" type="email" placeholder="camp@hospital.com"
                value={form.contactEmail} onChange={set('contactEmail')} />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate('/camps')} className="btn btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn btn-primary flex-1">
            {loading ? (
              <span className="flex items-center gap-2 justify-center">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Creating...
              </span>
            ) : '🎪 Create Camp'}
          </button>
        </div>
      </form>
    </div>
  )
}
