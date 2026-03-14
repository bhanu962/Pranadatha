import React, { useState, useEffect } from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import { adminApi } from '../services/api'
import { toast } from 'react-toastify'

ChartJS.register(
  CategoryScale, LinearScale, BarElement, ArcElement, PointElement,
  LineElement, Title, Tooltip, Legend, Filler
)

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#94a3b8', font: { family: 'Inter' } } },
    tooltip: {
      backgroundColor: '#1e293b',
      titleColor: '#f1f5f9',
      bodyColor: '#94a3b8',
      borderColor: '#334155',
      borderWidth: 1,
    },
  },
  scales: {
    x: { ticks: { color: '#64748b' }, grid: { color: '#1e293b' } },
    y: { ticks: { color: '#64748b' }, grid: { color: '#1e293b' } },
  },
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [userSearch, setUserSearch] = useState('')
  const [userRole, setUserRole] = useState('')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const [statsRes, usersRes] = await Promise.allSettled([
        adminApi.getStats(),
        adminApi.getUsers({ limit: 50 }),
      ])
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data)
      if (usersRes.status === 'fulfilled') setUsers(usersRes.value.data.users || [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  const loadUsers = async () => {
    try {
      const { data } = await adminApi.getUsers({ search: userSearch, role: userRole, limit: 50 })
      setUsers(data.users || [])
    } catch { /* ignore */ }
  }

  const toggleUser = async (id, name) => {
    try {
      const { data } = await adminApi.toggleUserActive(id)
      toast.success(`${name} ${data.isActive ? 'activated' : 'deactivated'}`)
      await loadUsers()
    } catch { toast.error('Failed to update user') }
  }

  // Chart data from stats
  const bloodGroupChartData = stats ? {
    labels: stats.bloodGroupStats.map((b) => b._id),
    datasets: [{
      label: 'Donors',
      data: stats.bloodGroupStats.map((b) => b.count),
      backgroundColor: ['#e11d48cc', '#be123ccc', '#9f1239cc', '#881337cc', '#7c3aedcc', '#6d28d9cc', '#f43f5ecc', '#fb7185cc'],
      borderColor: 'transparent',
      borderRadius: 6,
    }],
  } : null

  const requestTrendData = stats?.requestTrend ? {
    labels: stats.requestTrend.map((t) => `${t._id.year}/${String(t._id.month).padStart(2, '0')}`),
    datasets: [
      {
        label: 'Total Requests',
        data: stats.requestTrend.map((t) => t.count),
        borderColor: '#e11d48',
        backgroundColor: 'rgba(225,29,72,0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#e11d48',
      },
      {
        label: 'Fulfilled',
        data: stats.requestTrend.map((t) => t.fulfilled),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16,185,129,0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#10b981',
      },
    ],
  } : null

  const urgencyData = stats?.urgencyBreakdown ? {
    labels: stats.urgencyBreakdown.map((u) => u._id?.toUpperCase()),
    datasets: [{
      data: stats.urgencyBreakdown.map((u) => u.count),
      backgroundColor: ['#ef444455', '#f9731655', '#22c55e55'],
      borderColor: ['#ef4444', '#f97316', '#22c55e'],
      borderWidth: 2,
    }],
  } : null

  const TABS = ['overview', 'users', 'charts']

  return (
    <div className="page-container pt-24 animate-fade-in">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Platform overview and management</p>
        </div>
        <button onClick={loadData} className="btn btn-secondary btn-sm">🔄 Refresh</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-slate-900 rounded-xl border border-slate-800 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
              activeTab === tab ? 'bg-blood-700 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab === 'overview' ? '📊' : tab === 'users' ? '👥' : '📈'} {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7,8].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === 'overview' && stats && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Total Users', value: stats.stats.totalUsers, icon: '👥', color: 'text-white' },
                  { label: 'Total Donors', value: stats.stats.totalDonors, icon: '🩸', color: 'text-blood-400' },
                  { label: 'Active Donors', value: stats.stats.activeDonors, icon: '✅', color: 'text-emerald-400' },
                  { label: 'Blood Requests', value: stats.stats.totalRequests, icon: '🚨', color: 'text-amber-400' },
                  { label: 'Active Requests', value: stats.stats.activeRequests, icon: '⏳', color: 'text-orange-400' },
                  { label: 'Fulfilled', value: stats.stats.fulfilledRequests, icon: '💚', color: 'text-green-400' },
                  { label: 'Donations', value: stats.stats.totalDonations, icon: '💉', color: 'text-blue-400' },
                  { label: 'Fulfilment Rate', value: `${stats.stats.fulfillmentRate}%`, icon: '📊', color: 'text-purple-400' },
                ].map(({ label, value, icon, color }) => (
                  <div key={label} className="card text-center">
                    <div className="text-2xl mb-1">{icon}</div>
                    <div className={`text-2xl font-bold ${color}`}>{value}</div>
                    <div className="text-xs text-slate-400 mt-1">{label}</div>
                  </div>
                ))}
              </div>

              {/* City breakdown */}
              {stats.bloodGroupStats?.length > 0 && (
                <div className="card mb-6">
                  <h2 className="section-title">🩸 Blood Group Distribution</h2>
                  <div className="h-64">
                    <Bar data={bloodGroupChartData} options={{ ...chartDefaults, plugins: { ...chartDefaults.plugins, legend: { display: false } } }} />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Charts Tab */}
          {activeTab === 'charts' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {requestTrendData && (
                <div className="card md:col-span-2">
                  <h2 className="section-title">📈 Request Trend (6 months)</h2>
                  <div className="h-64">
                    <Line data={requestTrendData} options={chartDefaults} />
                  </div>
                </div>
              )}
              {urgencyData && (
                <div className="card">
                  <h2 className="section-title">🔴 Urgency Breakdown</h2>
                  <div className="h-64">
                    <Doughnut data={urgencyData} options={{ ...chartDefaults, scales: undefined, cutout: '70%' }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <input
                  className="input flex-1"
                  placeholder="Search by name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
                />
                <select className="input w-full sm:w-40" value={userRole} onChange={(e) => setUserRole(e.target.value)}>
                  <option value="">All Roles</option>
                  <option value="donor">Donor</option>
                  <option value="patient">Patient</option>
                  <option value="hospital">Hospital</option>
                  <option value="admin">Admin</option>
                </select>
                <button onClick={loadUsers} className="btn btn-primary btn-sm">Filter</button>
              </div>

              <div className="space-y-3">
                {users.map((u) => (
                  <div key={u._id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blood-900 flex items-center justify-center text-blood-300 font-bold flex-shrink-0">
                        {u.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{u.name}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                        <div className="flex gap-1.5 mt-1 flex-wrap">
                          <span className="badge badge-red text-xs">{u.role}</span>
                          {u.bloodGroup && <span className="badge badge-gray text-xs">{u.bloodGroup}</span>}
                          <span className={`badge text-xs ${u.isActive ? 'badge-green' : 'badge-gray'}`}>
                            {u.isActive ? 'Active' : 'Deactivated'}
                          </span>
                        </div>
                      </div>
                    </div>
                    {u.role !== 'admin' && (
                      <button
                        onClick={() => toggleUser(u._id, u.name)}
                        className={`btn btn-sm flex-shrink-0 ${u.isActive ? 'btn-danger' : 'btn-secondary'}`}
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
