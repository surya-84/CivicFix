import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  MapPin, Bell, LogOut, LayoutDashboard, Plus,
  ClipboardList, Home, Map, BarChart2, Wrench, X,
  User, ChevronDown, Shield, Info, PhoneCall, HelpCircle,
  CheckCircle, AlertTriangle, HeartHandshake
} from 'lucide-react'

const MOCK_NOTIFS_BY_ROLE = {
  citizen: [
    { id: 1, icon: '✅', text: 'Your complaint CIV-A1B2C was resolved by the Sanitation Team', time: '5m ago', unread: true },
    { id: 2, icon: '🤖', text: 'AI classified your issue as High Priority (Score 85/100)', time: '25m ago', unread: true },
    { id: 3, icon: '📍', text: 'Municipal maintenance completed in Ward 3', time: '2h ago', unread: false },
  ],
  worker: [
    { id: 1, icon: '🚨', text: 'New critical issue assigned: Broken pipe near Ward 3', time: '10m ago', unread: true },
    { id: 2, icon: '📍', text: 'Supervisor approved verification photo for CIV-9821', time: '1h ago', unread: false },
  ],
  admin: [
    { id: 1, icon: '⚠️', text: 'Ward 8 garbage accumulation flagged as high priority hotspot', time: '2m ago', unread: true },
    { id: 2, icon: '👷', text: 'Field worker Suresh Naidu completed 4 tasks today', time: '40m ago', unread: true },
    { id: 3, icon: '📊', text: 'Monthly resolution rate reached 89%', time: '3h ago', unread: false },
  ],
}

export default function Navbar({ user }) {
  const navigate                  = useNavigate()
  const { pathname, search }      = useLocation()
  const [showNotifs, setShowNotifs] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const notifRef   = useRef()
  const profileRef = useRef()

  const role = user?.role || 'guest'
  const notifs = MOCK_NOTIFS_BY_ROLE[role] || MOCK_NOTIFS_BY_ROLE.citizen
  const unreadCount = notifs.filter(n => n.unread).length

  // Links based on role
  const getNavLinks = () => {
    if (!user) {
      // Guest / Before login
      return [
        { to: '/home', label: 'Home', icon: Home },
        { to: '/how-it-works', label: 'How It Works', icon: HelpCircle },
        { to: '/volunteer-register', label: 'Volunteer', icon: HeartHandshake },
        { to: '/map', label: 'Civic Map', icon: Map },
        { to: '/about', label: 'About', icon: Info },
        { to: '/contact', label: 'Contact', icon: PhoneCall },
      ]
    }
    if (role === 'citizen') {
      return [
        { to: '/home', label: 'Home', icon: Home },
        { to: '/track', label: 'My Complaints', icon: ClipboardList },
        { to: '/how-it-works', label: 'How It Works', icon: HelpCircle },
        { to: '/about', label: 'About', icon: Info },
        { to: '/contact', label: 'Contact', icon: PhoneCall },
      ]
    }
    if (role === 'worker') {
      return [
        { to: '/worker', label: 'Dashboard & Tasks', icon: Wrench },
        { to: '/track', label: 'Assigned Issues', icon: ClipboardList },
        { to: '/map', label: 'Issue Map', icon: Map },
        { to: '/about', label: 'About', icon: Info },
      ]
    }
    if (role === 'admin') {
      return [
        { to: '/dashboard', label: 'Command Center', icon: LayoutDashboard },
        { to: '/track', label: 'All Complaints', icon: ClipboardList },
        { to: '/map', label: 'Live Map', icon: Map },
        { to: '/analytics', label: 'Analytics', icon: BarChart2 },
        { to: '/about', label: 'About', icon: Info },
      ]
    }
    return []
  }

  const navLinks = getNavLinks()

  const logout = () => {
    localStorage.removeItem('civicfix_user')
    navigate('/login')
  }

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false)
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfile(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <>
      {/* ── TOP NAV BAR ─────────────────────────────────────── */}
      <nav className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm sticky top-0 z-40 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

          {/* Brand Logo */}
          <Link to={user ? (role === 'admin' ? '/dashboard' : role === 'worker' ? '/worker' : '/home') : '/'} className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <span className="text-xl">🏙️</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-900 font-black text-xl tracking-tight">CIVIC<span className="text-blue-600">FIX</span></span>
                {user && (
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                    role === 'admin'   ? 'bg-purple-100 text-purple-700 border-purple-200' :
                    role === 'worker'  ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                         'bg-emerald-100 text-emerald-700 border-emerald-200'
                  }`}>
                    {role}
                  </span>
                )}
              </div>
              <p className="text-[10px] font-medium text-slate-400 -mt-0.5 hidden sm:block">Kakinada Smart City Platform</p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon, highlight }) => {
              const active = pathname === to
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    highlight
                      ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700 active:scale-95'
                      : active
                      ? 'bg-blue-50 text-blue-700 border border-blue-100 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${highlight ? 'text-white' : active ? 'text-blue-600' : 'text-slate-400'}`} />
                  {label}
                </Link>
              )
            })}
          </div>

          {/* Right Action Section */}
          <div className="flex items-center gap-2 sm:gap-3">
            {!user ? (
              /* Before login: Role Login Buttons */
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => navigate('/login?tab=citizen')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-all"
                >
                  Public
                </button>
                <button
                  onClick={() => navigate('/login?tab=worker')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-amber-700 hover:bg-amber-50 border border-amber-200 transition-all"
                >
                  Worker
                </button>
                <button
                  onClick={() => navigate('/login?tab=admin')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition-all"
                >
                  Admin
                </button>
              </div>
            ) : (
              /* After login: Notifications + User Profile Menu */
              <>
                {/* Notification Bell */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => setShowNotifs(!showNotifs)}
                    className="relative w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 active:scale-95 transition-all text-slate-600"
                    aria-label="Notifications"
                  >
                    <Bell className="w-4.5 h-4.5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white animate-pulse" />
                    )}
                  </button>

                  {/* Notifications Dropdown */}
                  {showNotifs && (
                    <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-50 to-blue-50/50 border-b border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <Bell className="w-4 h-4 text-blue-600" />
                          <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">Notifications</span>
                        </div>
                        <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          {unreadCount} new
                        </span>
                      </div>
                      <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                        {notifs.map(n => (
                          <div key={n.id} className={`px-4 py-3 flex gap-3 hover:bg-slate-50 transition-colors ${n.unread ? 'bg-blue-50/40' : ''}`}>
                            <span className="text-base shrink-0 mt-0.5">{n.icon}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-700 leading-snug">{n.text}</p>
                              <p className="text-[10px] text-slate-400 mt-1 font-medium">{n.time}</p>
                            </div>
                            {n.unread && <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5 shrink-0" />}
                          </div>
                        ))}
                      </div>
                      <div className="p-2 bg-slate-50 border-t border-slate-100 text-center">
                        <button
                          onClick={() => { setShowNotifs(false); navigate('/track') }}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-700"
                        >
                          View all complaints & updates →
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile Avatar Dropdown */}
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setShowProfile(!showProfile)}
                    className="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-xl hover:bg-slate-100 active:scale-95 transition-all"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black shadow-sm ${
                      role === 'admin'   ? 'bg-gradient-to-br from-purple-600 to-indigo-600' :
                      role === 'worker'  ? 'bg-gradient-to-br from-amber-500 to-orange-600' :
                                           'bg-gradient-to-br from-blue-600 to-cyan-600'
                    }`}>
                      {user?.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="hidden sm:flex flex-col text-left">
                      <span className="text-xs font-bold text-slate-800 leading-tight">
                        {user?.name || 'Surya'}
                      </span>
                      <span className="text-[10px] text-slate-400 capitalize -mt-0.5">
                        {role}
                      </span>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {/* Profile Dropdown Menu */}
                  {showProfile && (
                    <div className="absolute right-0 top-12 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="p-4 bg-gradient-to-br from-slate-50 to-blue-50/50 border-b border-slate-100">
                        <p className="font-black text-slate-800 text-sm">{user?.name || 'Surya'}</p>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">📞 {user?.phone || '9000000001'}</p>
                        <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                          <Shield className="w-3 h-3 text-blue-600" />
                          Role: <span className="capitalize text-blue-600">{role}</span>
                        </div>
                      </div>

                      <div className="p-2 space-y-1">
                        <Link
                          to={role === 'admin' ? '/dashboard' : role === 'worker' ? '/worker' : '/home'}
                          onClick={() => setShowProfile(false)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          <Home className="w-4 h-4 text-slate-400" />
                          My Dashboard
                        </Link>
                        <Link
                          to="/track"
                          onClick={() => setShowProfile(false)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          <ClipboardList className="w-4 h-4 text-slate-400" />
                          {role === 'admin' ? 'All Complaints' : role === 'worker' ? 'Assigned Tasks' : 'My Complaints'}
                        </Link>
                        <Link
                          to="/about"
                          onClick={() => setShowProfile(false)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          <Info className="w-4 h-4 text-slate-400" />
                          About CivicFix
                        </Link>
                      </div>

                      <div className="p-2 border-t border-slate-100 bg-slate-50/50">
                        <button
                          onClick={logout}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          Log Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── MOBILE BOTTOM NAVIGATION (Fixed bottom on small screens) ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 mobile-nav-safe shadow-lg">
        <div className="flex items-center justify-around py-1.5 px-2">
          {navLinks.slice(0, 4).map(({ to, label, icon: Icon, highlight }) => {
            const active = pathname === to
            return (
              <Link
                key={to}
                to={to}
                className={`flex-1 flex flex-col items-center py-1 gap-0.5 text-[10px] font-bold transition-all ${
                  highlight
                    ? 'text-blue-600'
                    : active
                    ? 'text-blue-600'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <div className={`w-9 h-7 flex items-center justify-center rounded-xl transition-all ${
                  highlight ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' : active ? 'bg-blue-100 text-blue-600' : ''
                }`}>
                  <Icon className={`w-4 h-4 ${highlight ? 'text-white' : ''}`} />
                </div>
                <span className="truncate max-w-[70px]">{label}</span>
              </Link>
            )
          })}
          {user && (
            <button
              onClick={logout}
              className="flex-1 flex flex-col items-center py-1 gap-0.5 text-[10px] font-bold text-slate-400 hover:text-red-500"
            >
              <div className="w-9 h-7 flex items-center justify-center rounded-xl">
                <LogOut className="w-4 h-4" />
              </div>
              <span>Logout</span>
            </button>
          )}
        </div>
      </div>
    </>
  )
}

