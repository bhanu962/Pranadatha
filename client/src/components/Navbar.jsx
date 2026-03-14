import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const BloodDropIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-blood-500">
    <path d="M12 2C12 2 4 10.5 4 16a8 8 0 0016 0C20 10.5 12 2 12 2z"/>
  </svg>
)

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const userMenuRef = useRef(null)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close menus on route change
  useEffect(() => {
    setMenuOpen(false)
    setUserMenuOpen(false)
  }, [location.pathname])

  // Close user dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const isActive = (path) => location.pathname === path

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/donors', label: 'Find Donors' },
    { to: '/requests', label: 'Blood Requests' },
    { to: '/camps', label: 'Camps' },
    { to: '/leaderboard', label: 'Leaderboard' },
  ]

  const roleHomePath =
    user?.role === 'admin' ? '/admin' :
    user?.role === 'donor' ? '/donor-dashboard' :
    user?.role === 'hospital' ? '/hospital-dashboard' :
    '/dashboard'

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-slate-950/95 backdrop-blur-lg border-b border-slate-800/80 shadow-lg shadow-black/30' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-blood-600/20 blur-md group-hover:blur-lg transition-all" />
              <BloodDropIcon />
            </div>
            <span className="font-bold text-lg text-white hidden sm:block">
              Blood<span className="text-blood-500">Finder</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive(to)
                    ? 'bg-blood-900/50 text-blood-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                {/* Emergency button */}
                <Link to="/emergency-request" className="hidden sm:flex btn btn-primary btn-sm">
                  🚨 Emergency
                </Link>

                {/* User menu */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all"
                  >
                    <div className="w-7 h-7 rounded-full bg-blood-600 flex items-center justify-center text-white text-xs font-bold">
                      {user?.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <span className="text-sm text-slate-200 hidden sm:block max-w-[100px] truncate">
                      {user?.name}
                    </span>
                    <svg className={`w-4 h-4 text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-52 glass rounded-2xl shadow-xl shadow-black/40 py-1 animate-fade-in">
                      <div className="px-4 py-2 border-b border-slate-700/50">
                        <p className="text-xs text-slate-400">Signed in as</p>
                        <p className="text-sm font-semibold text-white truncate">{user?.email}</p>
                        <span className="badge badge-red mt-1">{user?.role}</span>
                      </div>
                      <Link to={roleHomePath} className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors">
                        📊 Dashboard
                      </Link>
                      <Link to="/profile" className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors">
                        👤 Profile
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-slate-800/50 transition-colors"
                      >
                        🚪 Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn btn-secondary btn-sm">Login</Link>
                <Link to="/register" className="btn btn-primary btn-sm">Register</Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {menuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                }
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-slate-800 py-3 space-y-1 animate-slide-up">
            {navLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="block px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800"
              >
                {label}
              </Link>
            ))}
            {isAuthenticated && (
              <Link to="/emergency-request" className="block px-3 py-2.5 text-sm text-blood-400 font-semibold">
                🚨 Emergency Request
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navbar
