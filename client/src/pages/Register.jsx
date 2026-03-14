import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-toastify'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    phone: '', role: 'donor', bloodGroup: '', city: '',
    latitude: '', longitude: '',
  })

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

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
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match'); return
    }
    setLoading(true)
    try {
      await register({
        name: form.name, email: form.email, password: form.password,
        phone: form.phone, role: form.role, bloodGroup: form.bloodGroup,
        city: form.city,
        latitude: form.latitude || undefined,
        longitude: form.longitude || undefined,
      })
      toast.success('🎉 Welcome to Blood Donor Finder!')
      navigate(form.role === 'donor' ? '/donor-dashboard' : form.role === 'hospital' ? '/hospital-dashboard' : '/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20 bg-slate-950">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blood-900/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blood-900/50 rounded-2xl mb-4 border border-blood-800">
            <span className="text-3xl">🩸</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Create Account</h1>
          <p className="text-slate-400 mt-1">Join the Blood Donor Finder network</p>
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className={`w-8 h-1 rounded-full ${step >= 1 ? 'bg-blood-500' : 'bg-slate-700'}`} />
            <div className={`w-8 h-1 rounded-full ${step >= 2 ? 'bg-blood-500' : 'bg-slate-700'}`} />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          {/* Step 1 */}
          {step === 1 && (
            <>
              <div className="form-group">
                <label className="input-label">Full Name *</label>
                <input className="input" placeholder="John Doe" value={form.name}
                  onChange={set('name')} required autoComplete="name" />
              </div>
              <div className="form-group">
                <label className="input-label">Email *</label>
                <input className="input" type="email" placeholder="john@example.com"
                  value={form.email} onChange={set('email')} required autoComplete="email" />
              </div>
              <div className="form-group">
                <label className="input-label">Password * (min. 8 characters)</label>
                <input className="input" type="password" placeholder="Min. 8 characters"
                  value={form.password} onChange={set('password')} required minLength={8}
                  autoComplete="new-password" />
              </div>
              <div className="form-group">
                <label className="input-label">Confirm Password *</label>
                <input className="input" type="password" placeholder="Re-enter password"
                  value={form.confirmPassword} onChange={set('confirmPassword')} required
                  autoComplete="new-password" />
              </div>
              <button type="button" onClick={() => {
                if (!form.name || !form.email) { toast.error('Name and email are required'); return }
                if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return }
                if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return }
                setStep(2)
              }} className="btn btn-primary w-full">
                Continue →
              </button>
            </>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <>
              <div className="form-group">
                <label className="input-label">I am a *</label>
                <select className="input" value={form.role} onChange={set('role')} autoComplete="off">
                  <option value="donor">Blood Donor</option>
                  <option value="patient">Patient</option>
                  <option value="hospital">Hospital</option>
                </select>
              </div>
              <div className="form-group">
                <label className="input-label">Blood Group {form.role === 'donor' ? '*' : ''}</label>
                <select className="input" value={form.bloodGroup} onChange={set('bloodGroup')}
                  required={form.role === 'donor'} autoComplete="off">
                  <option value="">Select blood group</option>
                  {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="input-label">Phone</label>
                <input className="input" type="tel" placeholder="+91 9999999999"
                  value={form.phone} onChange={set('phone')} autoComplete="tel" />
              </div>
              <div className="form-group">
                <label className="input-label">City *</label>
                <input className="input" placeholder="Mumbai" value={form.city}
                  onChange={set('city')} required autoComplete="address-level2" />
              </div>
              <div>
                <label className="input-label">Location (for nearby matching)</label>
                <div className="flex gap-2">
                  <input className="input flex-1" type="number" placeholder="Latitude"
                    step="any" value={form.latitude} onChange={set('latitude')} autoComplete="off" />
                  <input className="input flex-1" type="number" placeholder="Longitude"
                    step="any" value={form.longitude} onChange={set('longitude')} autoComplete="off" />
                  <button type="button" onClick={getLocation} className="btn btn-secondary px-3" title="Auto-detect">📍</button>
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="btn btn-secondary flex-1">← Back</button>
                <button type="submit" disabled={loading} className="btn btn-primary flex-1">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Creating...
                    </span>
                  ) : '🩸 Create Account'}
                </button>
              </div>
            </>
          )}

          <p className="text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-blood-400 hover:text-blood-300 font-medium">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
