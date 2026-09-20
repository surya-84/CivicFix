import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import React, { Component, Suspense, lazy } from 'react'
import Navbar from './components/Navbar'
import Footer from './components/Footer'

// Eager imports (fast initial loading)
import Login from './pages/Login'

// Lazy imports (code-split for speed)
const CitizenHome        = lazy(() => import('./pages/CitizenHome'))
const ReportIssue        = lazy(() => import('./pages/ReportIssue'))
const TrackComplaints    = lazy(() => import('./pages/TrackComplaints'))
const NearbyMap          = lazy(() => import('./pages/NearbyMap'))
const MunicipalDashboard = lazy(() => import('./pages/MunicipalDashboard'))
const Analytics          = lazy(() => import('./pages/Analytics'))
const WorkerApp          = lazy(() => import('./pages/WorkerApp'))
const About              = lazy(() => import('./pages/About'))
const Contact            = lazy(() => import('./pages/Contact'))
const HowItWorks         = lazy(() => import('./pages/HowItWorks'))
const VolunteerRegister  = lazy(() => import('./pages/VolunteerRegister'))

function PageLoader() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-slate-50">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Loading CivicFix…</p>
      </div>
    </div>
  )
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, errorInfo) {
    console.error("CivicFix ErrorBoundary caught an error:", error, errorInfo)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-xl border border-slate-200 text-center space-y-4">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto text-2xl">
              ⚠️
            </div>
            <h2 className="text-xl font-black text-slate-800">Something went wrong</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              CivicFix encountered an issue rendering this section:
            </p>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left font-mono text-[11px] text-rose-700 overflow-x-auto max-h-32">
              {this.state.error?.message || 'Unknown render error'}
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null })
                  window.location.reload()
                }}
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition"
              >
                Reload Page
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('civicfix_user')
                  window.location.href = '/login'
                }}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Login Again
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function AppLayout({ children, allowedRoles, requireAuth = true }) {
  const user = JSON.parse(localStorage.getItem('civicfix_user') || 'null')

  if (requireAuth && !user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    const fallback = user.role === 'admin' ? '/dashboard' : user.role === 'worker' ? '/worker' : '/home'
    return <Navigate to={fallback} replace />
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar user={user} />
      <main className="flex-1">
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            {children}
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  )
}

function NotFoundRedirect() {
  const user = JSON.parse(localStorage.getItem('civicfix_user') || 'null')
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'admin')  return <Navigate to="/dashboard" replace />
  if (user.role === 'worker') return <Navigate to="/worker"    replace />
  return <Navigate to="/home" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3500,
          style: { borderRadius: '14px', fontSize: '13px', fontWeight: 600 },
        }}
      />
      <Routes>
        {/* Auth / Login route - ALWAYS displays Login page first */}
        <Route path="/login" element={<Login />} />

        {/* Public Informational Routes (with common Navbar & Footer) */}
        <Route path="/about" element={
          <AppLayout requireAuth={false}>
            <About />
          </AppLayout>
        } />
        <Route path="/contact" element={
          <AppLayout requireAuth={false}>
            <Contact />
          </AppLayout>
        } />
        <Route path="/how-it-works" element={
          <AppLayout requireAuth={false}>
            <HowItWorks />
          </AppLayout>
        } />
        <Route path="/volunteer-register" element={
          <AppLayout requireAuth={false}>
            <VolunteerRegister />
          </AppLayout>
        } />
        <Route path="/volunteer" element={<Navigate to="/volunteer-register" replace />} />

        {/* Citizen routes */}
        <Route path="/home" element={
          <AppLayout requireAuth={true} allowedRoles={['citizen', 'worker', 'admin']}>
            <CitizenHome />
          </AppLayout>
        } />
        <Route path="/report" element={
          <AppLayout allowedRoles={['citizen']}>
            <ReportIssue />
          </AppLayout>
        } />
        <Route path="/track" element={
          <AppLayout allowedRoles={['citizen', 'worker', 'admin']}>
            <TrackComplaints />
          </AppLayout>
        } />
        <Route path="/my-complaints" element={
          <AppLayout allowedRoles={['citizen', 'worker', 'admin']}>
            <TrackComplaints />
          </AppLayout>
        } />
        <Route path="/map" element={
          <AppLayout requireAuth={false}>
            <NearbyMap />
          </AppLayout>
        } />

        {/* Worker routes */}
        <Route path="/worker" element={
          <AppLayout allowedRoles={['worker', 'admin']}>
            <WorkerApp />
          </AppLayout>
        } />

        {/* Admin routes */}
        <Route path="/dashboard" element={
          <AppLayout allowedRoles={['admin', 'worker']}>
            <MunicipalDashboard />
          </AppLayout>
        } />
        <Route path="/analytics" element={
          <AppLayout allowedRoles={['admin']}>
            <Analytics />
          </AppLayout>
        } />

        {/* Root: ALWAYS open Login page first */}
        <Route path="/"  element={<Navigate to="/login" replace />} />
        <Route path="*"  element={<NotFoundRedirect />} />
      </Routes>
    </BrowserRouter>
  )
}

