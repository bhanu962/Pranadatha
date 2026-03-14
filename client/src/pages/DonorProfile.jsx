import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { donorApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { checkEligibility } from '../utils/eligibility'
import { toast } from 'react-toastify'

const LEVEL_BADGE = {
  gold:   { icon: '🥇', class: 'text-yellow-400 bg-yellow-900/30 border-yellow-800' },
  silver: { icon: '🥈', class: 'text-slate-300 bg-slate-700/50 border-slate-600' },
  bronze: { icon: '🥉', class: 'text-amber-600 bg-amber-900/30 border-amber-800' },
}

export default function DonorProfile() {
  const { id } = useParams()
  const { user } = useAuth()
  const [donor, setDonor] = useState(null)
  const [donations, setDonations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadDonor() }, [id])

  const loadDonor = async () => {
    try {
      const { data } = await donorApi.getById(id)
      setDonor(data.donor)
      setDonations(data.recentDonations || [])
    } catch { toast.error('Donor not found') }
    finally { setLoading(false) }
  }

  if (loading) return <div className="page-container pt-24"><div className="skeleton h-96 rounded-xl" /></div>
  if (!donor) return (
    <div className="page-container pt-24 text-center">
      <p className="text-slate-400">Donor not found.</p>
      <Link to="/donors" className="btn btn-secondary mt-4">← Back</Link>
    </div>
  )

  const eligibility = checkEligibility(donor)
  const lm = LEVEL_BADGE[donor.donorLevel] || LEVEL_BADGE.bronze

  return (
    <div className="page-container pt-24 max-w-2xl animate-fade-in">
      <Link to="/donors" className="text-sm text-slate-400 hover:text-white mb-6 inline-flex items-center gap-1">
        ← All Donors
      </Link>

      {/* Profile header */}
      <div className="card mb-4">
        <div className="flex items-start gap-5">
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blood-600 to-blood-900 flex items-center justify-center text-white text-3xl font-black shadow-lg">
              {donor.name?.charAt(0)?.toUpperCase()}
            </div>
            {donor.isAvailable && eligibility.eligible && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse" />
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-white">{donor.name}</h1>
              <span className={`badge border text-xs ${lm.class}`}>
                {lm.icon} {donor.donorLevel} donor
              </span>
            </div>
            <p className="text-blood-400 text-2xl font-extrabold mt-0.5">{donor.bloodGroup}</p>
            <p className="text-slate-400 text-sm mt-1">📍 {donor.city}</p>

            <div className="flex flex-wrap gap-2 mt-3">
              {donor.isAvailable ? (
                <span className="badge badge-green text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block mr-1" />
                  Available to donate
                </span>
              ) : (
                <span className="badge badge-gray text-xs">Unavailable</span>
              )}
              {eligibility.eligible ? (
                <span className="badge badge-blue text-xs">✅ Eligible now</span>
              ) : (
                <span className="badge badge-yellow text-xs">
                  ⏳ Eligible in {eligibility.daysUntilEligible}d
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mt-6 pt-4 border-t border-slate-800">
          <div className="text-center">
            <div className="text-2xl font-black text-blood-400">{donor.totalDonations || 0}</div>
            <div className="text-xs text-slate-400 mt-0.5">Donations</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black text-white">{donor.bloodGroup}</div>
            <div className="text-xs text-slate-400 mt-0.5">Blood Type</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-slate-300">
              {donor.lastDonationDate
                ? new Date(donor.lastDonationDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                : 'Never'}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">Last Donated</div>
          </div>
        </div>

        {/* Contact — only show if this is the user's own profile or they are admin */}
        {(user?._id === donor._id || user?.role === 'admin') && donor.phone && (
          <div className="mt-4 pt-4 border-t border-slate-800">
            <a href={`tel:${donor.phone}`} className="btn btn-primary w-full">📞 Call Donor</a>
          </div>
        )}
      </div>

      {/* Donation history */}
      {donations.length > 0 && (
        <div className="card">
          <h2 className="section-title">💉 Recent Donations</h2>
          <div className="space-y-2">
            {donations.map((d) => (
              <div key={d._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50">
                <div>
                  <p className="text-sm font-medium text-white">{d.hospitalName || d.camp?.title || 'Voluntary'}</p>
                  <p className="text-xs text-slate-400">{new Date(d.donationDate).toLocaleDateString()}</p>
                </div>
                <span className={`badge text-xs ${d.verified ? 'badge-green' : 'badge-gray'}`}>
                  {d.verified ? '✅ Verified' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
