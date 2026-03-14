import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-toastify'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const set = (f) => (e) => setForm({ ...form, [f]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { user } = await login(form)
      toast.success(`Welcome back, ${user.name}! 👋`)
      const path = user.role === 'admin' ? '/admin' : user.role === 'donor' ? '/donor-dashboard' : user.role === 'hospital' ? '/hospital-dashboard' : '/dashboard'
      navigate(path)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-950">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-blood-900/15 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        <div className="text-center mb-8">
          <span className="text-5xl">🩸</span>
          <h1 className="text-3xl font-bold text-white mt-3">Welcome Back</h1>
          <p className="text-slate-400 mt-1">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div className="form-group">
            <label className="input-label">Email</label>
            <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required autoFocus />
          </div>
          <div className="form-group">
            <label className="input-label">Password</label>
            <div className="relative">
              <input
                className="input pr-12"
                type={showPass ? 'text' : 'password'}
                placeholder="Your password"
                value={form.password}
                onChange={set('password')}
                required
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary w-full btn-lg">
            {loading ? (
              <span className="flex items-center gap-2 justify-center">
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Signing in...
              </span>
            ) : 'Sign In 🩸'}
          </button>

          <div className="pt-2 border-t border-slate-800 text-center space-y-2">
            <p className="text-sm text-slate-400">
              Don't have an account?{' '}
              <Link to="/register" className="text-blood-400 hover:text-blood-300 font-medium">Register</Link>
            </p>
          </div>
        </form>

        <div className="mt-4 p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-500">
          <p className="font-medium text-slate-400 mb-1">🧪 Demo accounts:</p>
          <p>Admin: admin@bloodfinder.app / admin123456</p>
          <p>Donor: arjun@donor.com / donor1234</p>
          <p>Hospital: apollo@hospital.com / hospital1234</p>
        </div>
      </div>
    </div>
  )
}
