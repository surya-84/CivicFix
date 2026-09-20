import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  Lock, User, Eye, EyeOff, Shield,
  Sparkles, HelpCircle
} from 'lucide-react'
import CompleteProfileModal from '../components/CompleteProfileModal'

// Swachh Bharat Abhiyan Logo Component
function SwachhBharatLogo({ className = "h-8" }) {
  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 rounded-full border-2 border-slate-700 flex items-center justify-center relative shadow-xs bg-white/75">
          <span className="text-[6px] font-black tracking-tight text-slate-800">स्वच्छ</span>
        </div>
        <div className="w-2.5 h-0.5 bg-slate-700 rounded-full" />
        <div className="w-5 h-5 rounded-full border-2 border-slate-700 flex items-center justify-center relative shadow-xs bg-white/75">
          <span className="text-[6px] font-black tracking-tight text-slate-800">भारत</span>
        </div>
      </div>
      <span className="text-[7px] font-bold text-slate-600 tracking-wider uppercase mt-0.5">
        एक कदम स्वच्छता की ओर
      </span>
    </div>
  )
}

// State Emblem of India (Ashoka Lion Capital Silhouette)
function AshokaEmblem({ className = "w-8 h-10" }) {
  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      <svg viewBox="0 0 100 130" className="w-full h-full text-amber-900 drop-shadow-xs" fill="currentColor">
        <path d="M50 8 C42 8 36 14 36 22 C36 28 40 32 44 35 C38 38 34 44 34 52 C34 58 38 64 43 67 C36 71 30 78 30 87 L70 87 C70 78 64 71 57 67 C62 64 66 58 66 52 C66 44 62 38 56 35 C60 32 64 28 64 22 C64 14 58 8 50 8 Z" opacity="0.9" />
        <circle cx="50" cy="98" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="50" cy="98" r="2" fill="currentColor" />
        <rect x="25" y="109" width="50" height="6" rx="2" fill="currentColor" />
        <rect x="20" y="117" width="60" height="4" rx="1.5" fill="currentColor" opacity="0.85" />
      </svg>
      <span className="text-[8px] font-black text-slate-800 tracking-widest uppercase font-serif">
        सत्यमेव जयते
      </span>
    </div>
  )
}

// Security Shield Verified Badge
function SecurityVerifiedBadge() {
  return (
    <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-xl border border-slate-200/80 shadow-xs">
      <div className="w-5 h-5 rounded-md bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-xs">
        <Shield className="w-3 h-3 fill-current" />
      </div>
      <div className="text-left leading-none">
        <p className="text-[9px] font-extrabold text-slate-800">Security</p>
        <p className="text-[8px] font-semibold text-slate-500">Verified</p>
      </div>
    </div>
  )
}

const TABS = ['citizen', 'worker', 'admin']

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') || 'citizen'

  const [tab, setTab]               = useState(TABS.includes(initialTab) ? initialTab : 'citizen')
  const [isRegister, setIsRegister] = useState(false)
  const [showPw, setShowPw]         = useState(false)
  const [loading, setLoading]       = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [fontSize, setFontSize]     = useState(100)
  const [lang, setLang]             = useState('en')
  const [highContrast, setHighContrast] = useState(false)
  const [forgotModal, setForgotModal]   = useState(false)
  const [completeProfileModal, setCompleteProfileModal] = useState(false)
  const [googleLoading, setGoogleLoading]               = useState(false)

  // Real Database City Stats State
  const [cityStats, setCityStats] = useState({
    total_reported: 0,
    total_resolved: 0,
    in_progress: 0,
    pending: 0,
    resolution_rate: 0,
    recent_resolved: [],
    completed_categories: [],
    status_distribution: [],
  })

  const [form, setForm] = useState({
    name: '',
    phone: '',
    password: '',
    role: initialTab,
  })

  useEffect(() => {
    const qTab = searchParams.get('tab')
    if (qTab && TABS.includes(qTab)) {
      setTab(qTab)
    }
  }, [searchParams])

  // Explicitly reset form fields to ensure no browser autofill or persisted values
  useEffect(() => {
    setForm({ name: '', phone: '', password: '', role: tab })
  }, [tab])

  useEffect(() => {
    async function loadStats() {
      try {
        const { data } = await axios.get('/api/public/city-stats')
        if (data) {
          setCityStats(data)
        }
      } catch (e) {
        console.error('Failed to load real city stats:', e)
      }
    }
    loadStats()
  }, [])

  // Listen for Google OAuth redirect status in URL query parameters
  useEffect(() => {
    const googleAuth = searchParams.get('google_auth')
    if (!googleAuth) return

    if (googleAuth === 'success') {
      const fetchSession = async () => {
        setGoogleLoading(true)
        try {
          // Clean URL immediately so tokens or parameters never linger in history
          window.history.replaceState({}, document.title, window.location.pathname)

          const { data } = await axios.get('/api/auth/session', { withCredentials: true })
          localStorage.setItem('civicfix_token', data.access_token)
          localStorage.setItem('civicfix_user', JSON.stringify({
            user_id: data.user_id,
            name: data.name,
            role: data.role,
            access_token: data.access_token,
            email: data.email,
            phone: data.phone,
            profile_picture: data.profile_picture,
            auth_provider: data.auth_provider,
            worker_code: data.worker_code,
            admin_code: data.admin_code,
            admin_level: data.admin_level,
            must_change_password: data.must_change_password,
            permissions: data.permissions || [],
            is_profile_complete: data.is_profile_complete,
          }))

          toast.success(`Welcome to CivicFix, ${data.name}!`)
          if (data.role === 'admin') navigate('/dashboard')
          else if (data.role === 'worker') navigate('/worker')
          else navigate('/home')
        } catch (err) {
          toast.error(err?.response?.data?.detail || 'Failed to authenticate Google session.')
        } finally {
          setGoogleLoading(false)
        }
      }
      fetchSession()
    } else if (googleAuth === 'needs_phone') {
      window.history.replaceState({}, document.title, window.location.pathname)
      setCompleteProfileModal(true)
    } else if (googleAuth === 'cancelled') {
      window.history.replaceState({}, document.title, window.location.pathname)
      toast('Google sign-in was cancelled.', { icon: 'ℹ️' })
    } else if (googleAuth === 'not_configured') {
      window.history.replaceState({}, document.title, window.location.pathname)
      toast.error('Google OAuth credentials not configured in backend/.env.')
    } else if (googleAuth === 'error') {
      const errorType = searchParams.get('error_type')
      window.history.replaceState({}, document.title, window.location.pathname)
      if (errorType === 'staff_account') {
        toast.error('This email is registered to municipal staff. Please sign in with your Worker ID or Admin ID.')
      } else if (errorType === 'deactivated') {
        toast.error('This account is deactivated. Please contact your municipal admin.')
      } else if (errorType === 'email_not_verified') {
        toast.error('Your Google email is not verified. Please verify your email with Google.')
      } else {
        toast.error('Google authentication failed. Please try again.')
      }
    }
  }, [searchParams, navigate])

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    try {
      const { data } = await axios.get('/api/auth/google/config')
      if (data && data.enabled) {
        window.location.href = '/api/auth/google'
      } else {
        toast((t) => (
          <div className="space-y-2 p-1 text-left">
            <p className="text-xs font-bold text-slate-800">Google OAuth Setup Notice</p>
            <p className="text-[11px] text-slate-600 leading-snug">
              Google OAuth credentials are not yet configured in <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700">backend/.env</code>.
            </p>
            <div className="flex flex-col gap-1.5 pt-1">
              <button
                type="button"
                onClick={async () => {
                  toast.dismiss(t.id)
                  try {
                    const res = await axios.post('/api/auth/google/dev-demo-login', {}, { withCredentials: true })
                    localStorage.setItem('civicfix_token', res.data.access_token)
                    localStorage.setItem('civicfix_user', JSON.stringify({
                      ...res.data,
                      is_profile_complete: true,
                    }))
                    toast.success(`Signed in as ${res.data.name} (Simulated Google Auth)`)
                    navigate('/home')
                  } catch (e) {
                    toast.error('Demo simulation failed')
                  }
                }}
                className="w-full py-1.5 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] transition-colors text-center"
              >
                ⚡ Test with One-Tap Google Demo Citizen →
              </button>
              <button
                type="button"
                onClick={() => {
                  toast.dismiss(t.id)
                  window.location.href = '/api/auth/google'
                }}
                className="w-full py-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[10px] text-center"
              >
                Proceed to /api/auth/google anyway
              </button>
            </div>
          </div>
        ), { duration: 8000 })
        setGoogleLoading(false)
      }
    } catch (err) {
      window.location.href = '/api/auth/google'
    }
  }

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const handleLoginWithCreds = async (phone, password, role) => {
    setLoading(true)
    try {
      const { data } = await axios.post('/api/auth/login', { phone, password })
      localStorage.setItem('civicfix_token', data.access_token)
      localStorage.setItem('civicfix_user', JSON.stringify({
        user_id: data.user_id,
        name: data.name,
        role: data.role,
        access_token: data.access_token,
        worker_code: data.worker_code,
        admin_code: data.admin_code,
        admin_level: data.admin_level,
        must_change_password: data.must_change_password,
        permissions: data.permissions || [],
      }))
      toast.success(`Welcome to CivicFix, ${data.name}!`)
      if (data.role === 'admin') navigate('/dashboard')
      else if (data.role === 'worker') navigate('/worker')
      else navigate('/home')
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Authentication failed. Please verify your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const role = tab
      const payload = isRegister
        ? { name: form.name, phone: form.phone, password: form.password, role }
        : { phone: form.phone, password: form.password }

      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login'
      const { data } = await axios.post(endpoint, payload)

      localStorage.setItem('civicfix_token', data.access_token)
      localStorage.setItem('civicfix_user', JSON.stringify({
        user_id: data.user_id,
        name: data.name,
        role: data.role,
        access_token: data.access_token,
        worker_code: data.worker_code,
        admin_code: data.admin_code,
        admin_level: data.admin_level,
        must_change_password: data.must_change_password,
        permissions: data.permissions || [],
      }))

      toast.success(`Welcome, ${data.name}!`)
      if (data.role === 'admin') navigate('/dashboard')
      else if (data.role === 'worker') navigate('/worker')
      else navigate('/home')
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Authentication failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  // Language Dictionary
  const T = {
    en: {
      govt: "Government of India",
      ministry: "Ministry of Housing and Urban Affairs",
      sub: "Together for a Cleaner, Safer, Better India",
      tagline1: "Clean Cities",
      tagline2: "Healthy Citizens",
      tagline3: "Better Tomorrow",
      statsTitle: "City stats",
      statsSub: "complaints resolved today",
      inputUser: "Email / Mobile / Worker ID / Admin ID",
      inputPw: "Password",
      remember: "Remember me",
      forgot: "Forgot Password?",
      signIn: "Sign In",
      registerPrompt: "Don't have an account?",
      registerLink: "Register",
      loginLink: "Sign In",
      official: "CivicFix | Government of India Initiative",
    },
    hi: {
      govt: "भारत सरकार",
      ministry: "आवासन और शहरी कार्य मंत्रालय",
      sub: "स्वच्छ, सुरक्षित और बेहतर भारत के लिए एकजुट",
      tagline1: "स्वच्छ शहर",
      tagline2: "स्वस्थ नागरिक",
      tagline3: "बेहतर कल",
      statsTitle: "शहर के आंकड़े",
      statsSub: "आज निवारित की गई शिकायतें",
      inputUser: "ईमेल / मोबाइल / कार्यकर्ता आईडी / एडमिन आईडी",
      inputPw: "पासवर्ड",
      remember: "मुझे याद रखें",
      forgot: "पासवर्ड भूल गए?",
      signIn: "लॉग इन करें",
      registerPrompt: "खाता नहीं है?",
      registerLink: "पंजीकरण करें",
      loginLink: "लॉग इन करें",
      official: "सिविकफिक्स | भारत सरकार की पहल",
    },
    te: {
      govt: "భారత ప్రభుత్వం",
      ministry: "గృహనిర్మాణ మరియు పట్టణ వ్యవహారాల మంత్రిత్వ శాఖ",
      sub: "పరిశుభ్రమైన, సురక్షితమైన, మెరుగైన భారతదేశం కోసం",
      tagline1: "పరిశుభ్ర నగరాలు",
      tagline2: "ఆరోగ్యవంతమైన పౌరులు",
      tagline3: "ఉజ్వల భవితవ్యం",
      statsTitle: "నగర గణాంకాలు",
      statsSub: "ఈరోజు పరిష్కరించబడిన సమస్యలు",
      inputUser: "ఇమెయిల్ / మొబైల్ / వర్కర్ ఐడి / అడ్మిన్ ఐడి",
      inputPw: "పాస్‌వర్డ్",
      remember: "నన్ను గుర్తుంచుకోండి",
      forgot: "పాస్‌వర్డ్ మర్చిపోయారా?",
      signIn: "లాగిన్ అవ్వండి",
      registerPrompt: "ఖాతా లేదా?",
      registerLink: "నమోదు చేసుకోండి",
      loginLink: "లాగిన్ అవ్వండి",
      official: "సివిక్‌ఫిక్స్ | భారత ప్రభుత్వ చొరవ",
    },
  }[lang]

  return (
    <div
      className={`min-h-screen md:h-screen md:max-h-screen w-full overflow-x-hidden overflow-y-auto md:overflow-hidden relative flex flex-col justify-between select-none transition-all duration-300 ${
        highContrast ? 'bg-black text-yellow-300' : 'text-slate-800'
      }`}
      style={{
        backgroundImage: 'url(/govt-portal-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundRepeat: 'no-repeat',
        fontSize: `${fontSize}%`,
      }}
    >
      {/* Subtle atmospheric gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.1) 40%, rgba(248,250,252,0.85) 100%)',
        }}
      />

      {/* ------------------------------------------------------------- */}
      {/* 1. TOP OFFICIAL GOVERNMENT ACCESSIBILITY BAR (COMPACT) */}
      {/* ------------------------------------------------------------- */}
      <header className="relative z-30 w-full px-3 sm:px-8 pt-2.5 pb-1 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-1.5 sm:gap-3">
          {/* Quick Accessibility Widget */}
          <div className="bg-white/90 backdrop-blur-md px-1.5 sm:px-2.5 py-1 rounded-xl border border-slate-200/90 shadow-xs flex items-center gap-1 sm:gap-1.5">
            <span className="text-[10px] font-bold text-slate-600 hidden sm:inline">Quick Accessibility</span>
            <div className="h-3.5 w-px bg-slate-200 hidden sm:block" />
            
            <button
              onClick={() => setHighContrast(!highContrast)}
              className="p-1 rounded-md bg-indigo-900 text-white hover:bg-indigo-800 transition-colors"
              title="Toggle Accessibility / Contrast"
            >
              <span className="text-[11px] leading-none block">♿</span>
            </button>

            <div className="flex items-center gap-0.5 bg-slate-100 rounded-md p-0.5 border border-slate-200">
              <button
                onClick={() => setFontSize(Math.max(85, fontSize - 5))}
                className="px-1 py-0.2 text-[9px] font-bold text-slate-700 hover:bg-white rounded transition-colors"
                title="Decrease Font Size"
              >
                A-
              </button>
              <button
                onClick={() => setFontSize(100)}
                className="px-1 py-0.2 text-[9px] font-bold text-slate-700 hover:bg-white rounded transition-colors"
                title="Reset Font Size"
              >
                Aa
              </button>
              <button
                onClick={() => setFontSize(Math.min(125, fontSize + 5))}
                className="px-1 py-0.2 text-[9px] font-bold text-slate-700 hover:bg-white rounded transition-colors"
                title="Increase Font Size"
              >
                A+
              </button>
            </div>

            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="bg-transparent text-[10px] font-bold text-slate-700 pr-2 pl-0.5 py-0.5 focus:outline-none cursor-pointer"
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
              <option value="te">తెలుగు</option>
            </select>
          </div>

          {/* Top Center: Swachh Bharat Abhiyan Logo */}
          <div className="flex flex-col items-center">
            <SwachhBharatLogo />
          </div>

          {/* Top Right: Indian Tricolor decorative graphic */}
          <div className="flex items-center gap-2">
            <div className="text-right hidden md:block leading-tight">
              <p className="text-[10px] font-extrabold text-slate-800">{T.govt}</p>
              <p className="text-[8px] font-semibold text-slate-500">{T.ministry}</p>
            </div>
            <div className="w-8 h-5 rounded shadow-xs overflow-hidden border border-slate-200/80 flex flex-col">
              <div className="flex-1 bg-[#FF9933]" />
              <div className="flex-1 bg-white flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full border border-blue-900" />
              </div>
              <div className="flex-1 bg-[#128807]" />
            </div>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* 2. MAIN CENTER SECTION WITH DUAL COLUMN (FITTED TO 100VH) */}
      {/* ------------------------------------------------------------- */}
      <main className="relative z-20 flex-1 min-h-0 max-w-7xl mx-auto w-full px-3.5 sm:px-8 flex flex-col lg:flex-row items-center justify-center lg:justify-between gap-6 my-auto py-5 lg:py-0 overflow-visible lg:overflow-hidden">
        
        {/* LEFT PLACEHOLDER: Lets the Ashoka Pillar shine through cleanly on desktop */}
        <div className="hidden lg:block lg:w-1/4 xl:w-1/3" />

        {/* ----------------------------------------------------------- */}
        {/* CENTER COLUMN: LUXURIOUS GOLD-TRIMMED GLASSMORPHIC LOGIN CARD */}
        {/* ----------------------------------------------------------- */}
        <div className="w-full max-w-[390px] mx-auto my-auto">
          <div
            className="rounded-[24px] sm:rounded-[28px] overflow-hidden shadow-2xl transition-all duration-300"
            style={{
              background: 'rgba(255, 255, 255, 0.88)',
              backdropFilter: 'blur(20px)',
              border: '2px solid rgba(212, 175, 55, 0.5)',
              boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.22), 0 0 0 1px rgba(212, 175, 55, 0.25)',
            }}
          >
            {/* Card Header: Ashoka Emblem + Swachh Bharat icon + Brand */}
            <div className="pt-4 px-4 sm:px-5 pb-2 text-center relative">
              <div className="flex items-center justify-center relative mb-0.5">
                <AshokaEmblem className="w-9 h-11" />
                <div className="absolute right-2 top-0 opacity-80 scale-75">
                  <SwachhBharatLogo />
                </div>
              </div>

              {/* Brand Title: CivicFix */}
              <h1 className="text-2xl font-black tracking-tight mt-0.5 leading-none">
                <span className="text-slate-900">Civic</span>
                <span className="text-emerald-600">Fix</span>
              </h1>
              <p className="text-[10px] font-medium text-slate-500 mt-0.5">
                {T.sub}
              </p>

              {/* 3 Segmented Role Selector (Citizen | Worker | Admin) */}
              <div
                className="mt-2.5 p-0.5 rounded-xl flex items-center gap-0.5 shadow-inner"
                style={{
                  background: 'linear-gradient(180deg, #3a3834 0%, #22201d 100%)',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
              >
                {TABS.map((t) => {
                  const active = tab === t
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setTab(t)
                        setIsRegister(false)
                        setForm({ name: '', phone: '', password: '', role: t })
                      }}
                      className={`flex-1 py-1.5 px-0.5 sm:px-1 rounded-lg text-[10.5px] sm:text-[11px] font-bold transition-all duration-200 capitalize tracking-wide ${
                        active
                          ? 'text-slate-900 shadow-sm font-black'
                          : 'text-slate-300 hover:text-white'
                      }`}
                      style={
                        active
                          ? {
                              background: 'linear-gradient(180deg, #f5f5f5 0%, #dcdcdc 50%, #c4c4c4 100%)',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.8)',
                            }
                          : {}
                      }
                    >
                      {t === 'citizen' ? 'Citizen' : t === 'worker' ? 'Worker' : 'Admin'}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Form Body (Compact & Elegant) */}
            <div className="px-4 sm:px-5 pb-4 pt-1">
              <form onSubmit={handleSubmit} className="space-y-2.5" autoComplete="off">
                {/* Hidden dummy inputs to absorb aggressive browser autofill engines */}
                <input type="text" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
                <input type="password" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
                
                {/* Full name input (citizen register mode) */}
                {isRegister && (
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      name="civic_register_name"
                      id="civic_register_name"
                      autoComplete="off"
                      required
                      placeholder="Full Legal Name"
                      value={form.name}
                      onChange={(e) => set('name', e.target.value)}
                      className="w-full bg-white/95 rounded-xl border border-slate-200/90 py-2 pl-9 pr-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                    />
                  </div>
                )}

                {/* Identifier Input (Email / Mobile / Worker ID / Admin ID) */}
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    name="civic_auth_identifier"
                    id="civic_auth_identifier"
                    autoComplete="new-password"
                    readOnly
                    onFocus={(e) => e.target.removeAttribute('readonly')}
                    required
                    placeholder={
                      tab === 'worker'
                        ? 'Worker ID (e.g. WRK-10482) / Mobile'
                        : tab === 'admin'
                        ? 'Admin ID (e.g. ADM-000001) / Mobile'
                        : T.inputUser
                    }
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    className="w-full bg-white/95 rounded-xl border border-slate-200/90 py-2 pl-9 pr-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                {/* Password Input */}
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type={showPw ? 'text' : 'password'}
                    name="civic_auth_secret_key"
                    id="civic_auth_secret_key"
                    autoComplete="new-password"
                    readOnly
                    onFocus={(e) => e.target.removeAttribute('readonly')}
                    required
                    placeholder={T.inputPw}
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                    className="w-full bg-white/95 rounded-xl border border-slate-200/90 py-2 pl-9 pr-9 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between text-[11px] pt-0.5 leading-none">
                  <label className="flex items-center gap-1.5 text-slate-600 cursor-pointer font-medium select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
                    />
                    <span>{T.remember}</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setForgotModal(true)}
                    className="font-bold text-blue-700 hover:text-blue-900 transition-colors"
                  >
                    {T.forgot}
                  </button>
                </div>

                {/* Primary Sign In Button */}
                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="w-full py-2.5 rounded-xl text-white font-extrabold text-xs tracking-wide transition-all shadow-md hover:shadow-lg active:scale-[0.99] flex items-center justify-center gap-2 mt-1"
                  style={{
                    background: 'linear-gradient(180deg, #1e3a8a 0%, #172554 100%)',
                    boxShadow: '0 6px 16px -3px rgba(23, 37, 84, 0.4)',
                  }}
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <span>{isRegister ? 'Register & Enter' : T.signIn}</span>
                  )}
                </button>

                {/* Continue with Google (Citizen Login only) */}
                {tab === 'citizen' && !isRegister && (
                  <div className="space-y-1.5 pt-0.5">
                    <div className="relative flex items-center justify-center my-1">
                      <div className="border-t border-slate-200 w-full" />
                      <span className="bg-white/95 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest relative">
                        OR
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={loading || googleLoading}
                      className="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 font-bold text-xs tracking-wide transition-all shadow-2xs hover:shadow-xs active:scale-[0.99] flex items-center justify-center gap-2.5 disabled:opacity-50"
                    >
                      {googleLoading ? (
                        <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                        </svg>
                      )}
                      <span>Continue with Google</span>
                    </button>
                  </div>
                )}

                {/* Citizen Registration toggle */}
                {tab === 'citizen' && (
                  <p className="text-center text-[11px] text-slate-600 pt-0.5">
                    {isRegister ? 'Already registered?' : T.registerPrompt}{' '}
                    <button
                      type="button"
                      onClick={() => setIsRegister(!isRegister)}
                      className="font-bold text-blue-700 hover:underline ml-0.5"
                    >
                      {isRegister ? T.loginLink : T.registerLink}
                    </button>
                  </p>
                )}

                {/* Volunteer worker prompt */}
                {tab === 'worker' && (
                  <div className="p-1.5 rounded-lg bg-emerald-50/90 border border-emerald-200/80 text-center">
                    <p className="text-[10px] text-emerald-800 font-semibold leading-tight">
                      Want to join as a civic volunteer?{' '}
                      <button
                        type="button"
                        onClick={() => navigate('/volunteer-register')}
                        className="font-black text-emerald-900 underline ml-1"
                      >
                        Apply Here →
                      </button>
                    </p>
                  </div>
                )}
              </form>

              {/* Quick One-Tap Demo Logins Bar (Compact for Hackathon Demo) */}
              <div className="mt-2.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-[9px] font-bold text-amber-900 mb-1">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                    One-Tap Demo Credentials:
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[8.5px] sm:text-[9px]">
                  <button
                    type="button"
                    onClick={() => handleLoginWithCreds('9000000001', 'citizen123', 'citizen')}
                    className="py-1 px-1 sm:px-1.5 rounded-lg bg-white border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 text-left transition-colors flex items-center justify-between shadow-2xs min-w-0"
                  >
                    <span className="truncate pr-0.5">👤 Ravi (Citizen)</span>
                    <span className="text-[7.5px] sm:text-[8px] text-blue-600 font-extrabold shrink-0">Public</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoginWithCreds('WRK-10482', 'worker123', 'worker')}
                    className="py-1 px-1 sm:px-1.5 rounded-lg bg-white border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 text-left transition-colors flex items-center justify-between shadow-2xs min-w-0"
                  >
                    <span className="truncate pr-0.5">🧑‍🔧 Field Worker</span>
                    <span className="text-[7.5px] sm:text-[8px] text-emerald-600 font-extrabold shrink-0">WRK</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoginWithCreds('ADM-000001', 'admin123', 'admin')}
                    className="py-1 px-1 sm:px-1.5 rounded-lg bg-white border border-indigo-200 font-bold text-slate-700 hover:bg-indigo-50 text-left transition-colors flex items-center justify-between shadow-2xs min-w-0"
                  >
                    <span className="truncate pr-0.5">👑 Super Admin</span>
                    <span className="text-[7.5px] sm:text-[8px] text-indigo-700 font-extrabold shrink-0">Full</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoginWithCreds('ADM-104820', 'coadmin123', 'admin')}
                    className="py-1 px-1 sm:px-1.5 rounded-lg bg-white border border-purple-200 font-bold text-slate-700 hover:bg-purple-50 text-left transition-colors flex items-center justify-between shadow-2xs min-w-0"
                  >
                    <span className="truncate pr-0.5">🛡️ Co-Admin</span>
                    <span className="text-[7.5px] sm:text-[8px] text-purple-700 font-extrabold shrink-0">Reset</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Card Base Decoration: Tricolor wave ribbon + Security Verified */}
            <div className="relative py-2 px-5 bg-gradient-to-t from-slate-100/90 to-transparent border-t border-slate-200/50">
              <div className="flex items-center justify-between">
                <SecurityVerifiedBadge />

                <div className="text-right leading-tight">
                  <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Digital India</p>
                  <p className="text-[7px] text-slate-400 font-medium">Smart Cities Mission</p>
                </div>
              </div>

              <div className="h-1 w-full rounded-full flex overflow-hidden mt-1.5 shadow-2xs">
                <div className="flex-1 bg-[#FF9933]" />
                <div className="flex-1 bg-white" />
                <div className="flex-1 bg-[#128807]" />
              </div>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------- */}
        {/* RIGHT COLUMN: OFFICIAL SLOGAN & LIVE CITY STATS (FITTED) */}
        {/* ----------------------------------------------------------- */}
        <div className="w-full max-w-[390px] lg:max-w-none lg:w-80 xl:w-88 flex flex-col items-center lg:items-start space-y-4 my-auto">
          
          {/* Slogan with Tricolor Accent Underline */}
          <div className="text-center lg:text-left leading-tight">
            <h2 className="text-xl sm:text-2xl xl:text-3xl font-black tracking-tight text-slate-800 leading-snug">
              {T.tagline1}
              <br />
              {T.tagline2}
              <br />
              <span className="text-slate-900">{T.tagline3}</span>
            </h2>
            <div className="flex gap-1 mt-1.5 w-24 mx-auto lg:mx-0">
              <div className="h-1 flex-1 bg-[#FF9933] rounded-full" />
              <div className="h-1 flex-1 bg-slate-300 rounded-full" />
              <div className="h-1 flex-1 bg-[#128807] rounded-full" />
            </div>
          </div>

          {/* Floating Frosted Glass "City stats" Card with REAL COMPLETED DATA */}
          <div
            className="w-full rounded-2xl p-3.5 sm:p-4 shadow-xl transition-all duration-300"
            style={{
              background: 'rgba(255, 255, 255, 0.82)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.7)',
              boxShadow: '0 16px 40px -10px rgba(0, 0, 0, 0.15)',
            }}
          >
            {/* Header: Title + Live Pulse */}
            <div className="flex items-center justify-between mb-0.5">
              <h3 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-1.5">
                <span>{T.statsTitle}</span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
                  Live Redressal
                </span>
              </h3>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[8px] font-bold text-slate-400 uppercase">Live DB</span>
              </div>
            </div>
            
            <p className="text-[11px] font-semibold text-slate-500 mb-2.5">
              Verified Complaints Actually Completed
            </p>

            {/* Real Stats Metric Row */}
            <div className="bg-slate-50/90 rounded-xl p-2.5 border border-slate-200/80 mb-2.5">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-black text-slate-900 tracking-tight">
                    {cityStats.total_resolved}
                  </span>
                  <span className="text-xs font-bold text-emerald-700 ml-1">Issues Resolved</span>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {cityStats.resolution_rate}% Solved
                </span>
              </div>
              <p className="text-[9px] font-medium text-slate-500 mt-0.5">
                Out of {cityStats.total_reported} total citizen complaints registered
              </p>

              {/* Proportionate Progress Bar */}
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex mt-2 shadow-2xs">
                <div
                  className="bg-emerald-500 transition-all duration-500"
                  style={{ width: `${cityStats.total_reported > 0 ? (cityStats.total_resolved / cityStats.total_reported) * 100 : 0}%` }}
                  title={`Resolved: ${cityStats.total_resolved}`}
                />
                <div
                  className="bg-blue-500 transition-all duration-500"
                  style={{ width: `${cityStats.total_reported > 0 ? (cityStats.in_progress / cityStats.total_reported) * 100 : 0}%` }}
                  title={`In Progress: ${cityStats.in_progress}`}
                />
                <div
                  className="bg-red-500 transition-all duration-500"
                  style={{ width: `${cityStats.total_reported > 0 ? (cityStats.pending / cityStats.total_reported) * 100 : 0}%` }}
                  title={`Pending: ${cityStats.pending}`}
                />
              </div>

              {/* Legend row */}
              <div className="flex items-center justify-between text-[9px] font-bold text-slate-600 mt-1.5 px-0.5">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Resolved: {cityStats.total_resolved}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  In Action: {cityStats.in_progress}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  Pending: {cityStats.pending}
                </span>
              </div>
            </div>

            {/* Actually Completed Issues List */}
            <div className="space-y-1.5">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Recently Resolved & Verified:
              </p>
              
              {cityStats.recent_resolved && cityStats.recent_resolved.length > 0 ? (
                cityStats.recent_resolved.slice(0, 2).map((item) => (
                  <div
                    key={item.id}
                    className="p-1.5 rounded-xl bg-white/95 border border-slate-200/90 flex items-center justify-between text-[10px] shadow-2xs"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm shrink-0">{item.emoji}</span>
                      <div className="min-w-0 truncate">
                        <p className="font-bold text-slate-800 leading-tight truncate">{item.label}</p>
                        <p className="text-[8px] text-slate-500 font-medium">
                          {item.id} · Ward {item.ward} · {item.resolved_at}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 px-1.5 py-0.5 rounded text-[8px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ✓ {item.ai_verification}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-2 text-center text-[10px] text-slate-400 italic">
                  No verified resolutions logged yet.
                </div>
              )}
            </div>

            {/* Bottom Status Ticker */}
            <div className="mt-2.5 pt-1.5 border-t border-slate-200/80 flex items-center justify-between text-[9px] font-semibold text-slate-600">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                100% Photo Proof Verified
              </span>
              <span className="text-blue-700 font-bold">KMC Municipal Portal</span>
            </div>
          </div>
        </div>
      </main>

      {/* ------------------------------------------------------------- */}
      {/* 3. OFFICIAL GOVERNMENT OF INDIA FOOTER (COMPACT) */}
      {/* ------------------------------------------------------------- */}
      <footer className="relative z-30 w-full py-2.5 px-3.5 sm:px-8 border-t border-slate-200/60 bg-white/80 backdrop-blur-md shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-2 text-center sm:text-left leading-tight">
          <div className="flex items-center gap-1.5 justify-center sm:justify-start">
            <AshokaEmblem className="w-4 h-6" />
            <div>
              <p className="text-[11px] font-black text-slate-800 tracking-tight">
                {T.official}
              </p>
              <p className="text-[9px] text-slate-500">
                National Urban Redressal Platform · Smart Cities Mission
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-[10px] font-semibold text-slate-600">
            <button
              onClick={() => toast('KMC Municipal Grievance Helpline: 1800-11-2024')}
              className="hover:text-blue-700 transition-colors"
            >
              Helpline: 1800-11-2024
            </button>
            <span>·</span>
            <button
              onClick={() => toast('Guidelines for Indian Government Websites (GIGW) Certified')}
              className="hover:text-blue-700 transition-colors"
            >
              GIGW Compliance
            </button>
            <span>·</span>
            <button
              onClick={() => toast('End-to-end TLS 1.3 encryption & ISO 27001 Security')}
              className="hover:text-blue-700 transition-colors"
            >
              STQC Security Certified
            </button>
          </div>
        </div>
      </footer>

      {/* ------------------------------------------------------------- */}
      {/* FORGOT PASSWORD MODAL */}
      {/* ------------------------------------------------------------- */}
      {forgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-5 border border-slate-100 text-center space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-black text-slate-800">Password Assistance</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              For citizen accounts, use your registered 10-digit mobile number to receive an SMS OTP.
              <br /><br />
              For municipal workers and administrators, password resets are governed by the Super Admin at the Municipal Command Center.
            </p>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-700">
              Helpline: 1800-11-2024 / support@civicfix.gov.in
            </div>
            <button
              onClick={() => setForgotModal(false)}
              className="w-full btn-primary py-2 text-xs font-bold"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Complete Profile Modal for Google Sign-in */}
      <CompleteProfileModal
        isOpen={completeProfileModal}
        onClose={() => setCompleteProfileModal(false)}
        onSuccess={() => {
          setCompleteProfileModal(false)
          navigate('/home')
        }}
      />
    </div>
  )
}
