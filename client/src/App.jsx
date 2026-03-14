import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import NotificationBell from './components/NotificationBell'

// Lazy-loaded pages for code splitting
const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const DonorDashboard = lazy(() => import('./pages/DonorDashboard'))
const HospitalDashboard = lazy(() => import('./pages/HospitalDashboard'))
const EmergencyRequest = lazy(() => import('./pages/EmergencyRequest'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))

// Loading spinner
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="text-5xl mb-4 animate-bounce-subtle">🩸</div>
      <div className="text-slate-400 text-sm">Loading...</div>
    </div>
  </div>
)

// Protected Route wrapper
const ProtectedRoute = ({ children, roles }) => {
  const { isAuthenticated, user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user?.role)) return <Navigate to="/" replace />
  return children
}

// Public-only route (redirect authenticated users)
const GuestRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (isAuthenticated) {
    const path = user?.role === 'admin' ? '/admin' : user?.role === 'donor' ? '/donor-dashboard' : user?.role === 'hospital' ? '/hospital-dashboard' : '/'
    return <Navigate to={path} replace />
  }
  return children
}

const AppRoutes = () => {
  const { isAuthenticated } = useAuth()

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Fixed Navbar always shown */}
      <Navbar />

      {/* Notification bell floated in top-right alongside navbar */}
      {isAuthenticated && (
        <div className="fixed top-3.5 right-20 z-50">
          <NotificationBell />
        </div>
      )}

      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

          {/* Protected: any role */}
          <Route path="/emergency-request" element={
            <ProtectedRoute roles={['patient', 'hospital', 'admin']}>
              <EmergencyRequest />
            </ProtectedRoute>
          } />

          {/* Donor */}
          <Route path="/donor-dashboard" element={
            <ProtectedRoute roles={['donor']}>
              <DonorDashboard />
            </ProtectedRoute>
          } />

          {/* Hospital */}
          <Route path="/hospital-dashboard" element={
            <ProtectedRoute roles={['hospital', 'admin']}>
              <HospitalDashboard />
            </ProtectedRoute>
          } />

          {/* Admin */}
          <Route path="/admin" element={
            <ProtectedRoute roles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />

          {/* Generic dashboard redirect */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardRedirect />
            </ProtectedRoute>
          } />

          {/* 404 */}
          <Route path="*" element={
            <div className="min-h-screen flex items-center justify-center text-center px-4 pt-24">
              <div>
                <div className="text-8xl mb-4">🩸</div>
                <h1 className="text-4xl font-bold text-white mb-2">404</h1>
                <p className="text-slate-400 mb-6">Page not found</p>
                <a href="/" className="btn btn-primary">Go Home</a>
              </div>
            </div>
          } />
        </Routes>
      </Suspense>

      <ToastContainer
        position="bottom-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </div>
  )
}

// Redirects user to their role-specific dashboard
const DashboardRedirect = () => {
  const { user } = useAuth()
  const path = user?.role === 'admin' ? '/admin' : user?.role === 'donor' ? '/donor-dashboard' : user?.role === 'hospital' ? '/hospital-dashboard' : '/'
  return <Navigate to={path} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
