import React from 'react'
import { Link } from 'react-router-dom'
import { formatDistance } from '../utils/distance'

const BLOOD_GROUP_COLORS = {
  'A+': 'from-rose-600 to-rose-800',
  'A-': 'from-pink-600 to-pink-800',
  'B+': 'from-red-600 to-red-800',
  'B-': 'from-orange-600 to-orange-800',
  'AB+': 'from-purple-600 to-purple-800',
  'AB-': 'from-violet-600 to-violet-800',
  'O+': 'from-blood-600 to-blood-800',
  'O-': 'from-crimson-600 to-blood-900',
}

const LEVEL_BADGE = {
  gold: { icon: '🥇', label: 'Gold', class: 'text-yellow-400 bg-yellow-900/30' },
  silver: { icon: '🥈', label: 'Silver', class: 'text-slate-300 bg-slate-700/50' },
  bronze: { icon: '🥉', label: 'Bronze', class: 'text-amber-700 bg-amber-900/30' },
}

const DonorCard = ({ donor, showDistance = false, showContact = false }) => {
  const bg = BLOOD_GROUP_COLORS[donor.bloodGroup] || 'from-blood-600 to-blood-800'
  const level = LEVEL_BADGE[donor.donorLevel] || LEVEL_BADGE.bronze

  const daysSinceDonation = donor.lastDonationDate
    ? Math.floor((Date.now() - new Date(donor.lastDonationDate)) / (1000 * 60 * 60 * 24))
    : null

  const isEligible = !daysSinceDonation || daysSinceDonation >= 90

  return (
    <div className="card-hover group cursor-pointer animate-fade-in">
      <div className="flex items-start gap-4">
        {/* Blood group badge */}
        <div className={`relative flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br ${bg} flex items-center justify-center shadow-lg`}>
          <span className="text-white font-bold text-base">{donor.bloodGroup}</span>
          {donor.isAvailable && isEligible && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse" title="Available" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="font-semibold text-white truncate">{donor.name}</h3>
            <span className={`badge text-xs ${level.class}`}>
              {level.icon} {level.label}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
            {donor.city && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                📍 {donor.city}
              </span>
            )}
            {showDistance && donor.distance !== undefined && (
              <span className="text-xs text-blood-400 font-medium">
                📌 {formatDistance(donor.distance)}
              </span>
            )}
            {donor.totalDonations > 0 && (
              <span className="text-xs text-slate-400">
                💉 {donor.totalDonations} donation{donor.totalDonations !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-2">
            {donor.isAvailable ? (
              <span className="badge badge-green text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse inline-block" />
                Available
              </span>
            ) : (
              <span className="badge badge-gray text-xs">Unavailable</span>
            )}
            {!isEligible && (
              <span className="badge badge-yellow text-xs">
                ⏳ {90 - daysSinceDonation}d until eligible
              </span>
            )}
            {isEligible && !daysSinceDonation && (
              <span className="badge badge-blue text-xs">First donation</span>
            )}
          </div>

          {showContact && donor.phone && (
            <a
              href={`tel:${donor.phone}`}
              className="mt-2 inline-flex items-center gap-1 text-xs text-blood-400 hover:text-blood-300 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              📞 {donor.phone}
            </a>
          )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
        {donor.lastDonationDate ? (
          <p className="text-xs text-slate-500">
            Last donated: {new Date(donor.lastDonationDate).toLocaleDateString()}
          </p>
        ) : (
          <p className="text-xs text-slate-500 italic">No donations yet</p>
        )}
        <Link
          to={`/donors/${donor._id}`}
          className="text-xs text-blood-400 hover:text-blood-300 font-medium transition-colors group-hover:underline"
        >
          View Profile →
        </Link>
      </div>
    </div>
  )
}

export default DonorCard
