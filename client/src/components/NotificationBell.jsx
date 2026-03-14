import React, { useEffect } from 'react'
import { useNotification } from '../hooks/useNotification'
import { useAuth } from '../context/AuthContext'

const NotificationBell = () => {
  const { isAuthenticated } = useAuth()
  const { isSubscribed, loading, permission, subscribe, unsubscribe, sendTest, checkSubscription } = useNotification()

  useEffect(() => {
    if (isAuthenticated) checkSubscription()
  }, [isAuthenticated, checkSubscription])

  if (!isAuthenticated || !('Notification' in window) || !('serviceWorker' in navigator)) return null

  return (
    <div className="relative group">
      <button
        disabled={loading}
        onClick={isSubscribed ? unsubscribe : subscribe}
        title={isSubscribed ? 'Notifications enabled — click to disable' : 'Enable push notifications'}
        className={`relative flex items-center justify-center w-10 h-10 rounded-xl border transition-all duration-200 ${
          isSubscribed
            ? 'bg-blood-900/50 border-blood-700 text-blood-400 hover:bg-blood-900'
            : permission === 'denied'
            ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
        }`}
      >
        {loading ? (
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : isSubscribed ? (
          <span className="text-lg" aria-label="Notifications on">🔔</span>
        ) : (
          <span className="text-lg" aria-label="Notifications off">🔕</span>
        )}
        {isSubscribed && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full border border-slate-900 animate-pulse" />
        )}
      </button>

      {/* Tooltip */}
      <div className="absolute right-0 top-12 w-48 glass rounded-xl p-3 shadow-xl shadow-black/40 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-10">
        <p className="text-xs text-slate-300 font-medium">
          {isSubscribed ? '🔔 Notifications Active' : '🔕 Notifications Off'}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          {isSubscribed
            ? 'You\'ll get emergency alerts nearby.'
            : permission === 'denied'
            ? 'Blocked in browser settings.'
            : 'Click to get emergency alerts.'}
        </p>
        {isSubscribed && (
          <button
            onClick={sendTest}
            className="mt-2 text-xs text-blood-400 hover:text-blood-300 underline pointer-events-auto"
          >
            Send test notification
          </button>
        )}
      </div>
    </div>
  )
}

export default NotificationBell
