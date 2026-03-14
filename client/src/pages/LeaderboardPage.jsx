import React, { useState, useEffect } from 'react'
import { donorApi } from '../services/api'
import { toast } from 'react-toastify'
import { Link } from 'react-router-dom'

const LEVEL_META = {
  gold:   { icon: '🥇', label: 'Gold',   class: 'from-yellow-600 to-yellow-800 border-yellow-700' },
  silver: { icon: '🥈', label: 'Silver', class: 'from-slate-400 to-slate-600 border-slate-500' },
  bronze: { icon: '🥉', label: 'Bronze', class: 'from-amber-700 to-amber-900 border-amber-800' },
}

export default function LeaderboardPage() {
  const [donors, setDonors] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await donorApi.getLeaderboard()
        setDonors(data.donors || [])
      } catch { toast.error('Failed to load leaderboard') }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const top3 = donors.slice(0, 3)
  const rest = donors.slice(3)

  return (
    <div className="page-container pt-24 animate-fade-in max-w-3xl">
      <div className="page-header text-center">
        <h1 className="page-title">🏆 Donor Leaderboard</h1>
        <p className="page-subtitle">Celebrating our most committed blood heroes</p>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3,4,5].map((i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
      ) : donors.length === 0 ? (
        <div className="card text-center py-14">
          <p className="text-slate-400">No donations recorded yet.</p>
        </div>
      ) : (
        <>
          {/* Top 3 podium */}
          {top3.length >= 3 && (
            <div className="grid grid-cols-3 gap-3 mb-10 mt-4 items-end">
              {/* 2nd place */}
              {top3[1] && (() => {
                const lm = LEVEL_META[top3[1].donorLevel] || LEVEL_META.bronze
                return (
                  <div className="text-center order-1">
                    <div className={`mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br ${lm.class} flex items-center justify-center text-2xl mb-2 border shadow-lg`}>
                      {lm.icon}
                    </div>
                    <div className="font-bold text-white text-sm truncate">{top3[1].name.split(' ')[0]}</div>
                    <div className="text-blood-400 font-bold">{top3[1].totalDonations}</div>
                    <div className="text-xs text-slate-400">donations</div>
                    <div className="mt-2 py-6 bg-slate-800 rounded-t-xl border border-slate-700 text-2xl font-black text-slate-400">2</div>
                  </div>
                )
              })()}
              {/* 1st place */}
              {top3[0] && (() => {
                const lm = LEVEL_META[top3[0].donorLevel] || LEVEL_META.bronze
                return (
                  <div className="text-center order-2">
                    <div className="text-3xl mb-1">👑</div>
                    <div className={`mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br ${lm.class} flex items-center justify-center text-3xl mb-2 border-2 shadow-xl ring-2 ring-yellow-500/30`}>
                      {lm.icon}
                    </div>
                    <div className="font-bold text-white truncate">{top3[0].name.split(' ')[0]}</div>
                    <div className="text-blood-400 font-black text-xl">{top3[0].totalDonations}</div>
                    <div className="text-xs text-slate-400">donations</div>
                    <div className="mt-2 py-9 bg-gradient-to-t from-blood-950 to-blood-900 rounded-t-xl border border-blood-800 text-3xl font-black text-blood-400">1</div>
                  </div>
                )
              })()}
              {/* 3rd place */}
              {top3[2] && (() => {
                const lm = LEVEL_META[top3[2].donorLevel] || LEVEL_META.bronze
                return (
                  <div className="text-center order-3">
                    <div className={`mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br ${lm.class} flex items-center justify-center text-xl mb-2 border shadow-lg`}>
                      {lm.icon}
                    </div>
                    <div className="font-bold text-white text-sm truncate">{top3[2].name.split(' ')[0]}</div>
                    <div className="text-blood-400 font-bold">{top3[2].totalDonations}</div>
                    <div className="text-xs text-slate-400">donations</div>
                    <div className="mt-2 py-4 bg-slate-800 rounded-t-xl border border-slate-700 text-xl font-black text-slate-500">3</div>
                  </div>
                )
              })()}
            </div>
          )}

          {/* Full ranked list */}
          <div className="space-y-2">
            {donors.map((donor, idx) => {
              const lm = LEVEL_META[donor.donorLevel] || LEVEL_META.bronze
              return (
                <Link
                  key={donor._id}
                  to={`/donors/${donor._id}`}
                  className="flex items-center gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-blood-800 hover:bg-slate-800/50 transition-all"
                >
                  <div className={`w-8 text-center font-bold ${idx < 3 ? 'text-blood-400' : 'text-slate-500'}`}>
                    {idx + 1}
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blood-700 to-blood-900 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {donor.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white truncate">{donor.name}</div>
                    <div className="text-xs text-slate-400">{donor.city} · {donor.bloodGroup}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-lg">{lm.icon}</div>
                    <div className="text-blood-400 font-bold text-sm">{donor.totalDonations} 💉</div>
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
