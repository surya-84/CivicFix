import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import L from 'leaflet'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconShadowUrl from 'leaflet/dist/images/marker-shadow.png'
import {
  Camera, Droplets, Trash2, Waves, AlertTriangle, Recycle,
  Lightbulb, CheckCircle2, Clock, ShieldCheck, HeartHandshake,
  MapPin, ArrowRight, Search, Check, Sparkles, Star,
  TrendingUp, BarChart2, Award, Zap, Layers, RefreshCw,
  ThumbsUp, ThumbsDown, ChevronRight, User, Shield
} from 'lucide-react'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl, shadowUrl: iconShadowUrl })

const STATUS_COLORS = {
  pending:     '#EF4444',
  assigned:    '#F59E0B',
  in_progress: '#3B82F6',
  resolved:    '#10B981',
}

const CATEGORY_ICONS = {
  water_leakage:        '💧',
  garbage_accumulation: '🗑️',
  broken_water_pipe:    '🚰',
  drainage_blockage:    '🕳️',
  waterlogging:         '🌊',
  illegal_dumping:      '♻️',
  other:                '💡',
}

const STEPS = [
  {
    step: '01',
    title: 'Report',
    short: 'Citizen Reports',
    emoji: '📷',
    headline: 'Tell us what is wrong in 60 seconds',
    summary: 'A citizen uploads a photograph, selects or confirms the category, provides an optional note, and GPS coordinates are detected automatically with ±8m precision.',
    details: [
      'Photo upload from camera or gallery',
      'Automatic GPS geolocation capture',
      'Select or confirm issue category',
      'Instant submission without bureaucratic forms'
    ],
  },
  {
    step: '02',
    title: 'AI Understands',
    short: 'Vision Analysis',
    emoji: '🤖',
    headline: 'Gemini Vision analyzes the problem',
    summary: 'CivicFix processes the image through AI vision models to identify the exact civic hazard, measure visual obstruction depth, and calculate initial severity.',
    details: [
      'Identifies category (e.g. Water Pipeline Leak · 94% confidence)',
      'Severity assessment: CRITICAL / HIGH / MODERATE / LOW',
      'Flags road obstructions, health hazards, or flooding risk',
      'Prevents citizens from miscategorizing issues'
    ],
  },
  {
    step: '03',
    title: 'Detect Duplicates',
    short: 'Consensus Check',
    emoji: '🔍',
    headline: 'Prevent repeated complaints from creating noise',
    summary: 'If multiple citizens report the same problem within a 50-meter radius and 48-hour window, CivicFix groups them into a single high-priority master ticket.',
    details: [
      'Groups Citizen A, B, and C reports into 1 ticket',
      'Increases urgency score based on citizen consensus (+3 reports)',
      'Prevents multiple municipal teams from dispatching to the same spot',
      'All reporting citizens receive synchronized progress updates'
    ],
  },
  {
    step: '04',
    title: 'Prioritize',
    short: 'Urgency Scoring',
    emoji: '⭐',
    headline: 'Not every problem has the same urgency',
    summary: 'CivicFix algorithmically computes a dynamic Priority Score (0–100) combining severity, community report consensus, elapsed pending duration, and public safety risk.',
    details: [
      'CRITICAL score (85–100): Burst pipelines, major road cave-ins',
      'HIGH score (70–84): Blocked main drains, overflowing garbage',
      'Dynamic escalation: Score increases every 12 hours unresolved',
      'Ensures municipal teams tackle the highest-risk issues first'
    ],
  },
  {
    step: '05',
    title: 'Route to Dept',
    short: 'GIS Precision',
    emoji: '📍',
    headline: 'Zero-bureaucracy GIS municipal dispatch',
    summary: 'Using GPS coordinates, our GIS spatial engine maps the complaint to the exact municipal ward, identifying the responsible department, ward depot, and zonal supervisor.',
    details: [
      'Precision coordinate lookup: Latitude 16.989, Longitude 82.247',
      'Mapped to Ward 3 (Kakinada Municipal Corporation)',
      'Routed directly to Water Works Dept & Sanitation Zonal Depot',
      'Automated dispatch notification sent to assigned supervisor'
    ],
  },
  {
    step: '06',
    title: 'Worker Resolves',
    short: 'Field Execution',
    emoji: '🧑‍🔧',
    headline: 'Field worker arrives and commences operations',
    summary: 'The designated field worker receives the task on their mobile dashboard, launches one-tap GPS navigation to the site, begins work, and updates live status.',
    details: [
      'Field worker views task details, location, and severity on mobile',
      'One-tap navigation via Google Maps GPS',
      'Status transitions from Assigned ➔ In Progress in real time',
      'Worker executes repairs or waste clearance operations'
    ],
  },
  {
    step: '07',
    title: 'Verify Fix',
    short: 'AI Verification',
    emoji: '🤖',
    headline: 'Before & After photographic AI verification',
    summary: 'A complaint cannot be closed with words alone. The field worker must capture an After-Photo of the repaired site. AI compares before vs after photos to confirm the fix.',
    details: [
      'Worker uploads photo of completed repair on site',
      'AI compares Before Image vs After Image',
      'Calculates verification score (e.g. 96% Resolution Verified ✓)',
      'Prevents premature ticket closures or false reporting'
    ],
  },
  {
    step: '08',
    title: 'Citizen Feedback',
    short: 'Citizen Feedback',
    emoji: '👤',
    headline: 'Power in the citizen’s hands',
    summary: 'The citizen who filed the report is immediately notified of resolution. They inspect the work and confirm with a simple rating: 👍 Fixed or 👎 Not Fixed.',
    details: [
      'Notification sent: "Your complaint CIV-A1B2C has been resolved"',
      'Citizen reviews before/after comparison photo proof',
      'Thumbs Up archives the ticket and awards civic karma points',
      'Thumbs Down automatically reopens ticket and escalates to supervisor'
    ],
  },
]

export default function CitizenHome() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('civicfix_user') || 'null')

  const [stats, setStats] = useState({
    total_reported: 1284,
    total_solved: 963,
    wards_covered: 87,
    active_departments: 14,
    resolution_rate: 75.0,
  })

  const [impact, setImpact] = useState({
    problems_solved: 963,
    resolution_rate: 75.0,
    avg_resolution_hours: 18.2,
    citizen_satisfaction: 4.8,
    water_saved_liters: 184200,
    garbage_cleared_tons: 14.6,
  })

  const [categories, setCategories] = useState([])
  const [mapData, setMapData] = useState(null)
  const [activeStep, setActiveStep] = useState(0)
  const [mapCategory, setMapCategory] = useState('all')
  const [myComplaintsCount, setMyComplaintsCount] = useState(null)
  const [loading, setLoading] = useState(true)

  const mapSectionRef = useRef(null)

  useEffect(() => {
    const loadPublicData = async () => {
      try {
        const [statsRes, impactRes, catRes, mapRes] = await Promise.all([
          axios.get('/api/public/stats'),
          axios.get('/api/public/impact'),
          axios.get('/api/public/categories'),
          axios.get('/api/public/map'),
        ])
        setStats(statsRes.data)
        setImpact(impactRes.data)
        setCategories(catRes.data)
        setMapData(mapRes.data)
      } catch (e) {
        console.warn('Using baseline public demo stats', e)
      } finally {
        setLoading(false)
      }

      // If citizen is logged in, fetch their own count
      if (user && user.role === 'citizen') {
        try {
          const myRes = await axios.get('/api/complaints/my')
          setMyComplaintsCount(myRes.data?.length || 0)
        } catch {}
      }
    }

    loadPublicData()
  }, [])

  const scrollToMap = () => {
    mapSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Filter map features by selected category
  const filteredMapFeatures = (mapData?.features || []).filter(f => {
    if (mapCategory === 'all') return true
    return f.properties?.category === mapCategory
  })

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      
      {/* ── 0. LOGGED-IN CITIZEN NOTIFICATION BANNER (if authenticated) ── */}
      {user && user.role === 'citizen' && (
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white px-4 py-3 shadow-md">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>
                Welcome back, <strong>{user.name}</strong>! You have{' '}
                <strong>{myComplaintsCount !== null ? myComplaintsCount : '…'} reported issues</strong> recorded in your account.
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/track"
                className="font-bold underline hover:text-blue-100 flex items-center gap-1"
              >
                Track My Complaints <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                to="/report"
                className="px-3 py-1 bg-white text-blue-800 font-bold rounded-lg shadow hover:bg-blue-50 transition"
              >
                + New Report
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── 1. HERO SECTION ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white pt-16 pb-20 px-4 sm:px-6 lg:px-8 shadow-2xl">
        {/* Subtle grid pattern & glow overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto text-center space-y-6">
          
          {/* Top Trust Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-indigo-200 shadow-sm">
            <span className="text-base">🇮🇳</span>
            <span>Kakinada Smart City Platform</span>
            <span className="text-white/40">·</span>
            <span className="text-yellow-400 font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> AI Vision & Precision GIS
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight sm:leading-none text-white drop-shadow-sm">
            MAKE YOUR CITY BETTER <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-yellow-300 bg-clip-text text-transparent">
              ONE REPORT AT A TIME.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-indigo-100/90 max-w-2xl mx-auto font-normal leading-relaxed">
            See a civic problem? Report it in 60 seconds. Our AI analyzes severity, groups duplicates, routes directly to the municipal team, and verifies the resolution with photo proof.
          </p>

          {/* Dual Action Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate(user ? '/report' : '/login?tab=citizen')}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-blue-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
            >
              <Camera className="w-5 h-5" />
              <span>REPORT AN ISSUE</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={scrollToMap}
              className="w-full sm:w-auto px-6 py-4 bg-white/10 hover:bg-white/15 active:bg-white/20 text-white border border-white/20 font-bold text-sm rounded-2xl backdrop-blur-md transition-all flex items-center justify-center gap-2"
            >
              <MapPin className="w-4 h-4 text-yellow-400" />
              <span>Explore Live Map</span>
            </button>

            <button
              onClick={() => navigate(user ? '/track' : '/login?tab=citizen')}
              className="w-full sm:w-auto px-6 py-4 bg-white/5 hover:bg-white/10 text-indigo-200 border border-white/10 font-bold text-sm rounded-2xl transition-all flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              <span>Track Existing Complaint</span>
            </button>
          </div>

          {/* Pillar feature tags */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-indigo-200/80">
            <span className="bg-white/10 backdrop-blur-xs px-3 py-1 rounded-xl border border-white/10">🤖 Gemini Vision AI</span>
            <span className="bg-white/10 backdrop-blur-xs px-3 py-1 rounded-xl border border-white/10">📍 Ward GIS Routing</span>
            <span className="bg-white/10 backdrop-blur-xs px-3 py-1 rounded-xl border border-white/10">🔍 Duplicate Consensus</span>
            <span className="bg-white/10 backdrop-blur-xs px-3 py-1 rounded-xl border border-white/10">📷 Before/After Proof</span>
            <span className="bg-white/10 backdrop-blur-xs px-3 py-1 rounded-xl border border-white/10">🔒 Strict RBAC Privacy</span>
          </div>

        </div>
      </section>

      {/* ── 2. LIVE IMPACT COUNTER ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-6 gap-2">
            <div>
              <p className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4" /> Real-time Civic Metrics
              </p>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800">
                OUR MEASURABLE IMPACT
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live backend database metrics</span>
            </div>
          </div>

          {/* 4 Counter Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Problems Reported */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 text-slate-800">
              <div className="flex items-center justify-between text-blue-600 mb-2">
                <span className="text-2xl font-black font-mono">
                  {stats.total_reported.toLocaleString()}
                </span>
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                  <Camera className="w-5 h-5" />
                </div>
              </div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-700">Problems Reported</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Citizens identifying city issues</p>
            </div>

            {/* Card 2: Problems Solved */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 text-slate-800">
              <div className="flex items-center justify-between text-emerald-600 mb-2">
                <span className="text-2xl font-black font-mono">
                  {stats.total_solved.toLocaleString()}
                </span>
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-700">Problems Solved</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Verified fixes by municipal crews</p>
            </div>

            {/* Card 3: Wards Covered */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 text-slate-800">
              <div className="flex items-center justify-between text-amber-600 mb-2">
                <span className="text-2xl font-black font-mono">
                  {stats.wards_covered}
                </span>
                <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-sm">
                  <MapPin className="w-5 h-5" />
                </div>
              </div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-700">Wards Covered</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Across Kakinada Municipal Corp</p>
            </div>

            {/* Card 4: Active Departments */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 text-slate-800">
              <div className="flex items-center justify-between text-purple-600 mb-2">
                <span className="text-2xl font-black font-mono">
                  {stats.active_departments}
                </span>
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm">
                  <Layers className="w-5 h-5" />
                </div>
              </div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-700">Active Departments</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Sanitation, Water, Roads, Drainage</p>
            </div>

          </div>

          {/* Resolution Rate Progress Bar */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">City-Wide Resolution Efficiency:</span>
              <span className="font-extrabold text-indigo-600 text-sm">{stats.resolution_rate}%</span>
            </div>
            <div className="w-full sm:w-1/2 bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-600 to-emerald-500 h-2.5 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(100, Math.max(10, stats.resolution_rate))}%` }}
              />
            </div>
          </div>

        </div>
      </section>

      {/* ── 2.5 🤝 CIVIC VOLUNTEER FORCE BANNER (Front Page Placement) ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-2">
        <div
          className="rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-6 border border-emerald-700/40"
          style={{
            background: 'linear-gradient(135deg, #09392e 0%, #0c483b 50%, #072a23 100%)',
            boxShadow: '0 20px 40px -15px rgba(9, 57, 46, 0.35)',
          }}
        >
          <div className="space-y-3 max-w-2xl relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 text-xs font-bold uppercase tracking-wider">
              <HeartHandshake className="w-4 h-4 text-emerald-400" />
              <span>CIVIC VOLUNTEER FORCE</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug">
              WANT TO HELP YOUR CITY? BECOME A<br className="hidden sm:inline" /> VOLUNTEER.
            </h2>

            <p className="text-emerald-100/80 text-xs sm:text-sm leading-relaxed max-w-xl">
              Join Kakinada Municipal Corporation as an authorized volunteer field worker. Clean waste hotspots, monitor drinking water pipelines, and receive official Worker ID accreditation.
            </p>
          </div>

          <div className="shrink-0 relative z-10">
            <button
              onClick={() => navigate('/volunteer-register')}
              className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-100 active:bg-slate-200 text-[#0a332a] font-black text-xs rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
            >
              <span>🤝</span>
              <span>Apply as Volunteer Worker</span>
              <ArrowRight className="w-4 h-4 text-[#0a332a]" />
            </button>
          </div>
        </div>
      </section>

      {/* ── 3. CENTERPIECE — 🛠️ "WHAT WE ACTUALLY DO" (The Complete 8-Step Lifecycle) ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-12">
        
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 text-indigo-600" /> Complete Complaint Journey
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
            WHAT WE ACTUALLY DO
          </h2>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Don't just take our word for it. Explore the complete 8-step intelligent lifecycle of every civic issue reported on CivicFix.
          </p>
        </div>

        {/* Step Selector Pills (Horizontal Scroll on Mobile) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {STEPS.map((s, idx) => (
            <button
              key={s.step}
              onClick={() => setActiveStep(idx)}
              className={`px-4 py-3 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 shrink-0 border ${
                activeStep === idx
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-transparent shadow-md shadow-blue-500/20 scale-102'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className="text-sm">{s.emoji}</span>
              <span>{s.step} — {s.title}</span>
            </button>
          ))}
        </div>

        {/* Interactive Active Step Display Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-200 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Explanation */}
          <div className="lg:col-span-6 space-y-5">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 font-mono font-bold text-xs">
                PHASE {STEPS[activeStep].step}
              </span>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                {STEPS[activeStep].short}
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2">
                <span className="text-3xl">{STEPS[activeStep].emoji}</span>
                {STEPS[activeStep].headline}
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                {STEPS[activeStep].summary}
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">How It Works:</p>
              {STEPS[activeStep].details.map((d, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs text-slate-700">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                  <span>{d}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 flex items-center gap-3">
              <button
                onClick={() => setActiveStep((activeStep + 1) % STEPS.length)}
                className="btn-primary text-xs px-5 py-2.5"
              >
                <span>Next: {STEPS[(activeStep + 1) % STEPS.length].title}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-400 font-medium">
                Step {activeStep + 1} of {STEPS.length}
              </span>
            </div>
          </div>

          {/* Right Column: Visual Diagram / Mock UI for this step */}
          <div className="lg:col-span-6 bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-inner space-y-4">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-3 text-xs">
              <span className="font-mono text-indigo-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                CIVICFIX ENGINE · DEMO PREVIEW
              </span>
              <span className="text-slate-400 font-mono">LIVE SIMULATION</span>
            </div>

            {/* Step 0: Report Preview */}
            {activeStep === 0 && (
              <div className="space-y-3 font-mono text-xs">
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-2">
                  <p className="text-indigo-300 font-bold">📷 IMAGE CAPTURED</p>
                  <p className="text-slate-300 text-[11px]">Source: Smartphone Camera (Back Lens)</p>
                  <p className="text-slate-300 text-[11px]">Resolution: 1920x1080 · Exif Geotag Attached</p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-1">
                  <p className="text-yellow-400 font-bold">📍 GPS GEOLOCATION</p>
                  <p className="text-slate-300 text-[11px]">Coordinates: 16.9891° N, 82.2475° E</p>
                  <p className="text-emerald-400 text-[11px]">✓ Accuracy: ±6 meters · Ward 3, Kakinada</p>
                </div>
              </div>
            )}

            {/* Step 1: AI Understands */}
            {activeStep === 1 && (
              <div className="space-y-3 font-mono text-xs">
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-2">
                  <p className="text-indigo-300 font-bold">🤖 GEMINI VISION AI CLASSIFICATION</p>
                  <div className="flex justify-between text-slate-300 text-xs">
                    <span>Detected Category:</span>
                    <span className="font-bold text-white">Water Pipeline Leak</span>
                  </div>
                  <div className="flex justify-between text-slate-300 text-xs">
                    <span>Model Confidence:</span>
                    <span className="font-bold text-emerald-400">94.8%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div className="bg-emerald-400 h-2 rounded-full w-[95%]" />
                  </div>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-1">
                  <p className="text-red-400 font-bold">🚨 SEVERITY COMPUTATION</p>
                  <p className="text-white font-bold text-sm">CRITICAL (Water Wastage + Road Flooding Risk)</p>
                </div>
              </div>
            )}

            {/* Step 2: Duplicate Detection */}
            {activeStep === 2 && (
              <div className="space-y-3 font-mono text-xs">
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-2">
                  <p className="text-yellow-400 font-bold">🔍 SPATIAL DUPLICATE CLUSTERING</p>
                  <div className="text-[11px] text-slate-300 space-y-1">
                    <p>Citizen A reported at 09:15 AM (CIV-4812)</p>
                    <p>Citizen B reported at 09:42 AM (34m away) ➔ MERGED</p>
                    <p>Citizen C reported at 10:05 AM (12m away) ➔ MERGED</p>
                  </div>
                </div>
                <div className="p-3 bg-indigo-500/20 rounded-xl border border-indigo-400/30 text-center">
                  <p className="text-white font-bold text-sm">ONE MASTER TICKET CREATED</p>
                  <p className="text-indigo-200 text-xs mt-0.5">+3 Verified Supporting Citizen Reports</p>
                </div>
              </div>
            )}

            {/* Step 3: Prioritize */}
            {activeStep === 3 && (
              <div className="space-y-3 font-mono text-xs">
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-3">
                  <p className="text-yellow-400 font-bold">⭐ CIVIC PRIORITY SCORE</p>
                  <div className="text-center py-2">
                    <span className="text-4xl font-black text-red-400">91</span>
                    <span className="text-slate-400 text-sm"> / 100</span>
                    <p className="text-xs text-red-300 mt-1">EMERGENCY DISPATCH PROTOCOL</p>
                  </div>
                  <div className="text-[11px] text-slate-300 space-y-1">
                    <p>• Severity Weight (CRITICAL): +40 pts</p>
                    <p>• Duplicate Consensus (3 reports): +25 pts</p>
                    <p>• Proximity to School / Main Road: +26 pts</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Route */}
            {activeStep === 4 && (
              <div className="space-y-3 font-mono text-xs">
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-2">
                  <p className="text-indigo-400 font-bold">📍 GIS BOUNDARY ROUTING</p>
                  <div className="text-[11px] text-slate-300 space-y-1.5">
                    <p>• Geofence: Kakinada Municipal Corporation</p>
                    <p>• Zonal Boundary: <span className="text-white font-bold">Ward 3</span></p>
                    <p>• Department: <span className="text-emerald-400 font-bold">Water Works Dept</span></p>
                    <p>• Assigned Supervisor: <span className="text-white">Sri M. Suresh Kumar</span></p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Worker Resolves */}
            {activeStep === 5 && (
              <div className="space-y-3 font-mono text-xs">
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-2">
                  <p className="text-blue-400 font-bold">🧑‍🔧 FIELD WORKER DISPATCH</p>
                  <p className="text-white font-bold">Assigned to: Suresh Naidu (WRK-10482)</p>
                  <p className="text-slate-300 text-[11px]">Distance: 450m away from site</p>
                  <div className="p-2 bg-blue-500/20 rounded-lg text-blue-200 text-[11px]">
                    ▶️ Status: In Progress · Work started at 10:14 AM
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Verify */}
            {activeStep === 6 && (
              <div className="space-y-3 font-mono text-xs">
                <div className="grid grid-cols-2 gap-2 text-center text-[10px]">
                  <div className="bg-white/5 p-2 rounded-lg border border-white/10">
                    <p className="text-red-400 font-bold">BEFORE</p>
                    <p className="text-slate-400">Broken Pipe Flooding</p>
                  </div>
                  <div className="bg-white/5 p-2 rounded-lg border border-white/10">
                    <p className="text-emerald-400 font-bold">AFTER PHOTO</p>
                    <p className="text-slate-400">Repaired Pipeline</p>
                  </div>
                </div>
                <div className="p-3 bg-emerald-500/20 rounded-xl border border-emerald-400/30 text-center">
                  <p className="text-emerald-300 font-bold text-sm">96% RESOLUTION CONFIRMED</p>
                  <p className="text-[11px] text-slate-300">Hazard eliminated · Site verification passed</p>
                </div>
              </div>
            )}

            {/* Step 7: Feedback */}
            {activeStep === 7 && (
              <div className="space-y-3 font-mono text-xs">
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-center space-y-3">
                  <p className="text-indigo-300 font-bold">WAS THIS ISSUE RESOLVED TO YOUR SATISFACTION?</p>
                  <div className="flex justify-center gap-3">
                    <div className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow">
                      <ThumbsUp className="w-3.5 h-3.5" /> YES, FIXED
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs flex items-center gap-1.5 shadow">
                      <ThumbsDown className="w-3.5 h-3.5" /> REOPEN TICKET
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400">92% citizen satisfaction rate on resolved complaints</p>
                </div>
              </div>
            )}

          </div>

        </div>

      </section>

      {/* ── 4. PUBLIC CIVICFIX LIVE IMPACT MAP ── */}
      <section ref={mapSectionRef} className="bg-slate-900 text-white py-20 px-4 sm:px-6 lg:px-8 shadow-inner">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider mb-2">
                <MapPin className="w-3.5 h-3.5" /> Anonymized Public Feed
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                CIVICFIX LIVE IMPACT MAP
              </h2>
              <p className="text-slate-400 text-sm mt-1 max-w-xl">
                Real-time geospatial distribution of complaints reported and resolved across Kakinada. Strictly anonymized for citizen privacy.
              </p>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold bg-white/5 p-3 rounded-2xl border border-white/10">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span>Unresolved / Pending</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                <span>In Progress</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span>Resolved</span>
              </div>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: 'all', label: 'All Categories' },
              { id: 'water_leakage', label: '💧 Water Leaks' },
              { id: 'garbage_accumulation', label: '🗑️ Garbage' },
              { id: 'drainage_blockage', label: '🕳️ Drainage' },
              { id: 'broken_water_pipe', label: '🚰 Broken Pipes' },
              { id: 'waterlogging', label: '🌊 Waterlogging' },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setMapCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  mapCategory === cat.id
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-white/10 text-slate-300 hover:bg-white/15'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Map Container */}
          <div className="rounded-3xl overflow-hidden shadow-2xl border border-white/10 h-[450px]">
            <MapContainer
              center={[16.9891, 82.2475]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="© OpenStreetMap"
              />
              {filteredMapFeatures.map((f, i) => {
                const [lng, lat] = f.geometry.coordinates
                const { status, severity, label, emoji, ward, priority_score, id } = f.properties
                const color = STATUS_COLORS[status] || '#EF4444'
                const radius = severity === 'CRITICAL' ? 12 : severity === 'HIGH' ? 9 : 7

                return (
                  <CircleMarker
                    key={id || i}
                    center={[lat, lng]}
                    radius={radius}
                    pathOptions={{ color: 'white', fillColor: color, fillOpacity: 0.85, weight: 2 }}
                  >
                    <Popup>
                      <div className="text-xs space-y-1 min-w-[150px] text-slate-800">
                        <p className="font-bold text-sm">{emoji} {label}</p>
                        <p className="text-slate-500 font-mono text-[10px]">{id}</p>
                        <p>Status: <b className="capitalize">{status?.replace('_', ' ')}</b></p>
                        <p>Severity: <b>{severity}</b></p>
                        <p>Priority: <b>{priority_score}/100</b></p>
                        <p>Ward: <b>Ward {ward}</b></p>
                      </div>
                    </Popup>
                  </CircleMarker>
                )
              })}
            </MapContainer>
          </div>

        </div>
      </section>

      {/* ── 5. PUBLIC "OUR WORK IN NUMBERS" (Problems Solved by Category) ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-12">
        
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
            MAKING A MEASURABLE DIFFERENCE
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
            OUR WORK IN NUMBERS
          </h2>
          <p className="text-slate-600 text-sm">
            Verifiable public metrics directly computed from real civic complaint resolutions.
          </p>
        </div>

        {/* 4 Performance Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <p className="text-3xl sm:text-4xl font-black text-emerald-600 font-mono">{impact.problems_solved}</p>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mt-1">Problems Solved</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <p className="text-3xl sm:text-4xl font-black text-blue-600 font-mono">{impact.resolution_rate}%</p>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mt-1">Resolution Rate</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <p className="text-3xl sm:text-4xl font-black text-indigo-600 font-mono">{impact.avg_resolution_hours}h</p>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mt-1">Avg Resolution Time</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <p className="text-3xl sm:text-4xl font-black text-amber-500 font-mono">{impact.citizen_satisfaction} / 5</p>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mt-1">Citizen Satisfaction ⭐</p>
          </div>
        </div>

        {/* Category Breakdown Bars */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-lg font-black text-slate-800">
              Issues Resolved by Category
            </h3>
            <p className="text-xs text-slate-500">Live breakdown across civic infrastructure sectors</p>
          </div>

          <div className="space-y-4">
            {categories.map(c => (
              <div key={c.category} className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-800 flex items-center gap-1.5">
                    <span>{c.emoji}</span>
                    <span>{c.label}</span>
                  </span>
                  <span className="text-slate-500">
                    <strong className="text-slate-800">{c.solved}</strong> / {c.total} solved ({c.pct}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 h-3 rounded-full transition-all duration-700"
                    style={{ width: `${Math.max(8, c.pct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

      </section>

      {/* ── 6. ❤️ "WHY CIVICFIX?" (The 5 Civic Pillars) ── */}
      <section className="bg-gradient-to-b from-slate-100 to-slate-50 py-20 px-4 sm:px-6 lg:px-8 border-t border-slate-200">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
              COMMUNITY-FIRST TECHNOLOGY
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
              WHY CIVICFIX?
            </h2>
            <p className="text-slate-600 text-sm">
              Traditional grievance redressal systems fail because of wrong categorization, slow routing, and zero proof. CivicFix changes that.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl">
                🤖
              </div>
              <h3 className="text-base font-black text-slate-800">Smarter</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Gemini Vision AI understands photos, assesses severity, and prevents misrouting before any ticket is dispatched.
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl">
                📍
              </div>
              <h3 className="text-base font-black text-slate-800">Faster</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Precision GIS geofencing routes issues directly to the local ward supervisor without administrative delays.
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl">
                🔍
              </div>
              <h3 className="text-base font-black text-slate-800">Transparent</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Swiggy-style delivery tracking lets citizens follow each milestone: Reported ➔ AI Verified ➔ Assigned ➔ In Progress.
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl">
                ♻️
              </div>
              <h3 className="text-base font-black text-slate-800">Accountable</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Field workers must submit After-Photos verified by AI. Tickets cannot be closed with empty promises.
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-2xl">
                👥
              </div>
              <h3 className="text-base font-black text-slate-800">Community Driven</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Duplicate clustering aggregates community voice, escalating urgent multi-report issues to emergency response status.
              </p>
            </div>

          </div>

        </div>
      </section>

    </div>
  )
}
