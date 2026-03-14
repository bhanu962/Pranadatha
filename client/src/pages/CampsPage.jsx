import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { campApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useLocation } from '../hooks/useLocation'
import { toast } from 'react-toastify'

export default function CampsPage() {
  const { isAuthenticated, user } = useAuth()
  const { location } = useLocation()
  const [camps, setCamps] = useState([])
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(null)
  const [viewMode, setViewMode] = useState('upcoming') // upcoming | nearby

  useEffect(() => {
    if (viewMode === 'nearby' && location) loadNearby()
    else loadAll()
  }, [viewMode, location])

  const loadAll = async () => {
    setLoading(true)
    try {
      const { data } = await campApi.getAll({ status: 'upcoming', limit: 30 })
      setCamps(data.camps || [])
    } catch { toast.error('Failed to load camps') }
    finally { setLoading(false) }
  }

  const loadNearby = async () => {
    if (!location) return
    setLoading(true)
    try {
      const { data } = await campApi.getNearby({
        latitude: location.latitude, longitude: location.longitude, radius: 50,
      })
      setCamps(data.camps || [])
    } catch { toast.error('Failed to load nearby camps') }
    finally { setLoading(false) }
  }

  const handleRegister = async (campId) => {
    if (!isAuthenticated) { toast.info('Login to register for camps'); return }
    setRegistering(campId)
    try {
      await campApi.register(campId)
      toast.success('🎉 Registered for camp!')
      loadAll()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Registration failed')
    } finally { setRegistering(null) }
  }

  const isRegistered = (camp) =>
    camp.registeredDonors?.some((d) => d._id === user?._id || d === user?._id)

  return (
    <div className="page-container pt-24 animate-fade-in">
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">🎪 Donation Camps</h1>
          <p className="page-subtitle">Find blood donation events near you</p>
        </div>
        {(user?.role === 'hospital' || user?.role === 'admin') && (
          <Link to="/camps/create" className="btn btn-primary btn-sm">+ Create Camp</Link>
        )}
      </div>

      {/* Toggle */}
      <div className="flex gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 w-fit mb-6">
        {['upcoming', 'nearby'].map((mode) => (
          <button key={mode} onClick={() => setViewMode(mode)}
            className={`px-5 py-2 rounded-lg text-sm capitalize transition-all ${
              viewMode === mode ? 'bg-blood-700 text-white' : 'text-slate-400 hover:text-white'
            }`}>
            {mode === 'upcoming' ? '📅' : '📍'} {mode}
          </button>
        ))}
      </div>

      {!location && viewMode === 'nearby' && (
        <div className="mb-4 p-3 rounded-xl bg-amber-950/50 border border-amber-800 text-amber-300 text-sm">
          ⚠️ Enable location access to find nearby camps
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map((i) => <div key={i} className="skeleton h-52 rounded-xl" />)}
        </div>
      ) : camps.length === 0 ? (
        <div className="card text-center py-14">
          <div className="text-5xl mb-3">🎪</div>
          <p className="text-slate-400">No camps found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {camps.map((camp) => {
            const reg = isRegistered(camp)
            const spotsLeft = (camp.maxDonors || 0) - (camp.registeredDonors?.length || 0)
            const isFull = spotsLeft <= 0

            return (
              <div key={camp._id} className="card-hover">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-blood-900/60 border border-blood-800 flex items-center justify-center text-2xl flex-shrink-0">
                    🎪
                  </div>
                  <span className={`badge text-xs ${
                    camp.status === 'upcoming' ? 'badge-green' : camp.status === 'ongoing' ? 'badge-blue' : 'badge-gray'
                  }`}>
                    {camp.status}
                  </span>
                </div>

                <h3 className="font-bold text-white text-base leading-tight mb-1">{camp.title}</h3>
                <p className="text-sm text-slate-400 mb-2">🏥 {camp.organizer}</p>

                <div className="space-y-1 text-xs text-slate-400 mb-3">
                  <p>📍 {camp.address}, {camp.city}</p>
                  <p>📅 {new Date(camp.startDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  <p>🕐 {camp.startTime} – {camp.endTime}</p>
                  {camp.maxDonors && (
                    <p className={isFull ? 'text-red-400' : spotsLeft < 10 ? 'text-amber-400' : 'text-emerald-400'}>
                      👥 {isFull ? 'Fully booked' : `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`}
                    </p>
                  )}
                </div>

                {/* Blood groups accepted */}
                {camp.bloodGroupsNeeded?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {camp.bloodGroupsNeeded.map((g) => (
                      <span key={g} className="badge badge-red text-xs">{g}</span>
                    ))}
                  </div>
                )}

                {/* Action */}
                {isAuthenticated && user?.role === 'donor' && camp.status === 'upcoming' && (
                  reg ? (
                    <div className="badge badge-green text-xs w-full text-center py-2">✅ Registered</div>
                  ) : (
                    <button
                      onClick={() => handleRegister(camp._id)}
                      disabled={registering === camp._id || isFull}
                      className="btn btn-primary w-full btn-sm"
                    >
                      {registering === camp._id ? 'Registering...' : isFull ? 'Fully Booked' : '🩸 Register'}
                    </button>
                  )
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
