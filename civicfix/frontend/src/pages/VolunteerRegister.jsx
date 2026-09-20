import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  Users, CheckCircle2, Clock, ShieldCheck, HeartHandshake,
  MapPin, Phone, Mail, User, Lock, Award, Calendar,
  ArrowRight, Search, Check, AlertCircle, Copy, Building2
} from 'lucide-react'

const DEPARTMENTS = [
  { id: 'Sanitation', name: 'Sanitation & Solid Waste', icon: '🗑️', desc: 'Garbage clearing, bin maintenance & cleanliness drives' },
  { id: 'Water Works', name: 'Water Works & Supply', icon: '💧', desc: 'Pipeline leaks, tap repairs & drinking water supply' },
  { id: 'Drainage', name: 'Drainage & Stormwater', icon: '🕳️', desc: 'Drain desilting, blockage clearance & flood prevention' },
  { id: 'Roads', name: 'Roads & Infrastructure', icon: '🛣️', desc: 'Pothole surveys, road repairs & footpath maintenance' },
  { id: 'Street Lighting', name: 'Street Lighting & Electrical', icon: '💡', desc: 'Faulty streetlight reporting & wire hazards' },
  { id: 'Public Parks', name: 'Parks & Urban Greenery', icon: '🌳', desc: 'Park upkeep, plantation & public space beautification' },
]

const AVAILABILITY_OPTIONS = [
  { id: 'Morning', label: 'Morning (6 AM - 11 AM)' },
  { id: 'Afternoon', label: 'Afternoon (12 PM - 5 PM)' },
  { id: 'Evening', label: 'Evening (5 PM - 9 PM)' },
  { id: 'Weekends', label: 'Weekends Only' },
  { id: 'Flexible', label: 'Flexible / On-Call' },
]

const SKILL_TAGS = [
  'Waste Segregation', 'Basic Plumbing', 'Electrical Repair',
  'Civil Engineering', 'Community Outreach', 'First Aid',
  'Photography / Survey', 'Driving (Commercial/2W)', 'Heavy Lifting'
]

export default function VolunteerRegister() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('apply') // 'apply' | 'track'

  // Application Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    dob: '',
    city: 'Kakinada',
    ward: '3',
    address: '',
    department: '',
    skills: [],
    availability: '',
    reason: '',
    password: '',
    confirmPassword: '',
  })
  const [agreedTerms, setAgreedTerms] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submittedApp, setSubmittedApp] = useState(null)

  // Prevent browser cached values / autofill from preselecting or populating fields on mount
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      email: '',
      password: '',
      confirmPassword: '',
      department: '',
      availability: '',
      skills: [],
    }))
  }, [])

  // Status Lookup State
  const [trackQuery, setTrackQuery] = useState('')
  const [trackLoading, setTrackLoading] = useState(false)
  const [trackResult, setTrackResult] = useState(null)
  const [copiedId, setCopiedId] = useState(false)

  const handleTextChange = (e) => {
    const { name, value } = e.target
    const fieldMap = {
      vol_applicant_email: 'email',
      vol_secret_password: 'password',
      vol_confirm_password: 'confirmPassword',
    }
    const key = fieldMap[name] || name
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const toggleSkill = (skill) => {
    setFormData(prev => {
      const exists = prev.skills.includes(skill)
      const skills = exists ? prev.skills.filter(s => s !== skill) : [...prev.skills, skill]
      return { ...prev, skills }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.department) {
      toast.error('Please select your preferred department in Section 3.')
      return
    }

    if (!formData.availability) {
      toast.error('Please select your time availability in Section 3.')
      return
    }

    if (!agreedTerms) {
      toast.error('Please agree to the municipal volunteer terms and code of conduct.')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters.')
      return
    }

    if (!formData.phone || formData.phone.length < 10) {
      toast.error('Please enter a valid 10-digit phone number.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        dob: formData.dob || null,
        city: formData.city,
        ward: formData.ward,
        address: formData.address.trim() || null,
        department: formData.department,
        skills: formData.skills.join(', '),
        availability: formData.availability,
        reason: formData.reason.trim(),
        password: formData.password,
      }

      const { data } = await axios.post('/api/volunteers/register', payload)
      setSubmittedApp(data)
      toast.success('Volunteer application submitted successfully!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Application failed. Please check your details.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleTrackStatus = async (e) => {
    e.preventDefault()
    if (!trackQuery.trim()) {
      toast.error('Enter an Application ID or registered phone number')
      return
    }

    setTrackLoading(true)
    setTrackResult(null)
    try {
      const isPhone = /^\d{10}$/.test(trackQuery.trim())
      const params = isPhone ? { phone: trackQuery.trim() } : { application_id: trackQuery.trim() }
      const { data } = await axios.get('/api/volunteers/status', { params })
      setTrackResult(data)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No application found with these details.')
    } finally {
      setTrackLoading(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopiedId(true)
    toast.success('Copied to clipboard!')
    setTimeout(() => setCopiedId(false), 2000)
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Card */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
                <HeartHandshake className="w-4 h-4" /> Community Action Program
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                Volunteer Worker Portal
              </h1>
              <p className="mt-2 text-indigo-200 text-sm sm:text-base max-w-xl leading-relaxed">
                Join Kakinada Municipal Corporation as a community field responder. Receive real-time municipal tasks, clean and repair your ward, and get officially verified.
              </p>
            </div>
            
            <div className="flex flex-col gap-2 shrink-0">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-center">
                <p className="text-xs text-indigo-200 font-medium">Already applied?</p>
                <button
                  type="button"
                  onClick={() => setMode(mode === 'track' ? 'apply' : 'track')}
                  className="mt-2 px-4 py-2 bg-white text-indigo-950 hover:bg-indigo-50 font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  {mode === 'track' ? 'Submit New Application' : 'Check Application Status'}
                </button>
              </div>
            </div>
          </div>

          {/* Stepper info bar */}
          <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-indigo-200">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-500/30 border border-blue-400/40 flex items-center justify-center text-white font-bold">1</span>
              <span>Submit Volunteer Application</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-500/30 border border-amber-400/40 flex items-center justify-center text-amber-300 font-bold">2</span>
              <span>Admin Verification & Approval</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-500/30 border border-emerald-400/40 flex items-center justify-center text-emerald-300 font-bold">3</span>
              <span>Worker ID Issued & Active Login</span>
            </div>
          </div>
        </div>

        {/* MODE: STATUS CHECKER */}
        {mode === 'track' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
            <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <Search className="w-5 h-5 text-indigo-600" />
                  Check Volunteer Application Status
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter your Application ID (e.g. VOL-1012) or the 10-digit phone number you used during registration.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMode('apply')}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                ← Back to Form
              </button>
            </div>

            <form onSubmit={handleTrackStatus} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Enter Application ID (e.g. VOL-1012) or Phone Number"
                value={trackQuery}
                onChange={(e) => setTrackQuery(e.target.value)}
                className="input-field text-sm flex-1"
                required
              />
              <button
                type="submit"
                disabled={trackLoading}
                className="btn-primary whitespace-nowrap px-6 text-sm"
              >
                {trackLoading ? 'Searching…' : 'Check Status'}
              </button>
            </form>

            {/* Status Result Card */}
            {trackResult && (
              <div className="mt-6 border rounded-2xl p-6 bg-slate-50 border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Application Reference</span>
                    <h3 className="text-2xl font-black text-slate-800">{trackResult.application_id}</h3>
                    <p className="text-xs text-slate-600 font-medium">Applicant: {trackResult.name} · Ward {trackResult.ward}</p>
                  </div>
                  <div>
                    {trackResult.status === 'pending' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        <Clock className="w-3.5 h-3.5" /> PENDING ADMIN REVIEW
                      </span>
                    )}
                    {trackResult.status === 'approved' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5" /> APPROVED & ACTIVATED
                      </span>
                    )}
                    {trackResult.status === 'rejected' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
                        <AlertCircle className="w-3.5 h-3.5" /> NOT APPROVED
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200 text-xs text-slate-700">
                  <div><span className="font-semibold text-slate-500">Department:</span> {trackResult.department}</div>
                  <div><span className="font-semibold text-slate-500">Submitted:</span> {new Date(trackResult.created_at).toLocaleDateString('en-IN')}</div>
                </div>

                {trackResult.status === 'pending' && (
                  <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 text-amber-900 text-xs space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-600" /> Application Under Review
                    </p>
                    <p>
                      Municipal administrators are verifying your details and assigning your department ward allocation. Once approved, your Worker ID will appear here and you can log into the Worker Portal.
                    </p>
                  </div>
                )}

                {trackResult.status === 'approved' && (
                  <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-200 text-emerald-950 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Assigned Worker ID</p>
                        <p className="text-2xl font-black font-mono text-emerald-900 mt-0.5">
                          {trackResult.worker_id_generated}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(trackResult.worker_id_generated)}
                        className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition flex items-center gap-1"
                      >
                        {copiedId ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedId ? 'Copied' : 'Copy ID'}
                      </button>
                    </div>
                    {trackResult.admin_notes && (
                      <p className="text-xs text-emerald-800 bg-white/60 p-2.5 rounded-lg border border-emerald-200/60">
                        <span className="font-bold">Admin Note:</span> {trackResult.admin_notes}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => navigate('/login?tab=worker')}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
                    >
                      Login to Field Worker Portal <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {trackResult.status === 'rejected' && (
                  <div className="bg-red-50 rounded-xl p-4 border border-red-200 text-red-900 text-xs space-y-1">
                    <p className="font-bold">Application Status: Rejected</p>
                    <p>{trackResult.admin_notes || 'Thank you for your interest. Current municipal openings in this department are full.'}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* MODE: SUBMITTED SUCCESS VIEW */}
        {submittedApp && mode === 'apply' && (
          <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-sm border border-emerald-200 text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                <Clock className="w-3.5 h-3.5" /> Status: PENDING REVIEW
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                Application Submitted Successfully!
              </h2>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Thank you, <span className="font-bold text-slate-800">{submittedApp.name}</span>. Your application to join the municipal volunteer force is recorded.
              </p>
            </div>

            <div className="max-w-sm mx-auto bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Your Application Reference</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-3xl font-black font-mono text-indigo-700">{submittedApp.application_id}</span>
                <button
                  onClick={() => copyToClipboard(submittedApp.application_id)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition"
                  title="Copy Application ID"
                >
                  {copiedId ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">Save this ID to track review status anytime.</p>
            </div>

            <div className="max-w-lg mx-auto text-left text-xs bg-blue-50 text-blue-900 p-4 rounded-xl border border-blue-200 space-y-2">
              <p className="font-bold flex items-center gap-1.5 text-blue-950">
                <ShieldCheck className="w-4 h-4 text-blue-600" /> What happens next?
              </p>
              <ul className="space-y-1.5 list-disc list-inside text-blue-800">
                <li>Municipal Administrators will review your profile and ward allocation.</li>
                <li>Upon approval, a unique <strong>Worker ID (e.g. WRK-XXXXX)</strong> is generated.</li>
                <li>You can then log into the <strong>Field Worker Portal</strong> using your Worker ID and password.</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4">
              <button
                type="button"
                onClick={() => { setTrackQuery(submittedApp.application_id); setMode('track'); }}
                className="btn-secondary text-xs"
              >
                <Search className="w-4 h-4" /> Track This Application
              </button>
              <button
                type="button"
                onClick={() => navigate('/login?tab=worker')}
                className="btn-primary text-xs"
              >
                Go to Worker Login Portal <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* MODE: REGISTRATION FORM */}
        {!submittedApp && mode === 'apply' && (
          <form
            onSubmit={handleSubmit}
            autoComplete="off"
            className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-slate-200 space-y-8"
          >
            {/* Hidden dummy fields to prevent browser credential managers from autofilling real inputs */}
            <input
              type="text"
              name="fake_volunteer_user"
              id="fake_volunteer_user"
              style={{ position: 'absolute', opacity: 0, height: 0, width: 0, zIndex: -1, pointerEvents: 'none' }}
              tabIndex={-1}
              aria-hidden="true"
              autoComplete="off"
            />
            <input
              type="password"
              name="fake_volunteer_pass"
              id="fake_volunteer_pass"
              style={{ position: 'absolute', opacity: 0, height: 0, width: 0, zIndex: -1, pointerEvents: 'none' }}
              tabIndex={-1}
              aria-hidden="true"
              autoComplete="new-password"
            />
            
            {/* Section 1: Personal Details */}
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-600" />
                  1. Personal & Contact Information
                </h2>
                <p className="text-xs text-slate-500">Official name and contact credentials for municipal records</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Legal Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder="e.g. Ravi Teja"
                      value={formData.name}
                      onChange={handleTextChange}
                      className="input-field pl-9 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Phone Number *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      name="phone"
                      required
                      maxLength={10}
                      placeholder="10-digit mobile number"
                      value={formData.phone}
                      onChange={handleTextChange}
                      className="input-field pl-9 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      name="vol_applicant_email"
                      id="vol_applicant_email"
                      autoComplete="off"
                      readOnly
                      onFocus={(e) => { e.target.readOnly = false }}
                      placeholder="e.g. ravi@gmail.com"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="input-field pl-9 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="date"
                      name="dob"
                      value={formData.dob}
                      onChange={handleTextChange}
                      className="input-field pl-9 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Location & Ward */}
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                  2. Operational Location & Municipal Ward
                </h2>
                <p className="text-xs text-slate-500">Select where you can be dispatched to resolve field issues</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">City / Corporation</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleTextChange}
                    className="input-field text-sm bg-slate-100 text-slate-600"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Preferred Ward Number *</label>
                  <select
                    name="ward"
                    value={formData.ward}
                    onChange={handleTextChange}
                    className="input-field text-sm"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(w => (
                      <option key={w} value={String(w)}>Ward {w} (Kakinada)</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Residential / Area Address</label>
                  <input
                    type="text"
                    name="address"
                    placeholder="e.g. 4-12, Temple Street, Ward 12, Kakinada"
                    value={formData.address}
                    onChange={handleTextChange}
                    className="input-field text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Department & Skills */}
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Award className="w-4 h-4 text-indigo-600" />
                  3. Department Preference & Field Skills
                </h2>
                <p className="text-xs text-slate-500">Pick which municipal team matches your interest</p>
              </div>

              {/* Department Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {DEPARTMENTS.map(dept => (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, department: dept.id }))}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      formData.department === dept.id
                        ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-200'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span className="text-2xl">{dept.icon}</span>
                    <p className="text-xs font-bold text-slate-800 mt-2">{dept.name}</p>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">{dept.desc}</p>
                  </button>
                ))}
              </div>

              {/* Skills Tags */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-2">Relevant Skills / Experience</label>
                <div className="flex flex-wrap gap-2">
                  {SKILL_TAGS.map(skill => {
                    const selected = formData.skills.includes(skill)
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all ${
                          selected
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {selected ? `✓ ${skill}` : `+ ${skill}`}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Availability */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Time Availability *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {AVAILABILITY_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, availability: opt.id }))}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border text-center transition-all ${
                        formData.availability === opt.id
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason / Statement */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Why do you want to volunteer? *</label>
                <textarea
                  name="reason"
                  rows={3}
                  required
                  placeholder="Share a few words on why you want to support municipal operations in your ward..."
                  value={formData.reason}
                  onChange={handleTextChange}
                  className="input-field text-sm"
                />
              </div>
            </div>

            {/* Section 4: Portal Password */}
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-indigo-600" />
                  4. Create Worker Portal Password
                </h2>
                <p className="text-xs text-slate-500">
                  You will use this password together with your phone / Worker ID after municipal approval
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Password *</label>
                  <input
                    type="password"
                    name="vol_secret_password"
                    id="vol_secret_password"
                    autoComplete="new-password"
                    readOnly
                    onFocus={(e) => { e.target.readOnly = false }}
                    required
                    placeholder="At least 6 characters"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="input-field text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Confirm Password *</label>
                  <input
                    type="password"
                    name="vol_confirm_password"
                    id="vol_confirm_password"
                    autoComplete="new-password"
                    readOnly
                    onFocus={(e) => { e.target.readOnly = false }}
                    required
                    placeholder="Re-enter password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="input-field text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Agreement & Submit */}
            <div className="space-y-4 pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>
                  I declare that the information provided is true and accurate. I understand that submitting this form creates a <strong>pending volunteer application</strong> which must be verified and approved by Kakinada Municipal Corporation administrators before worker portal access is granted.
                </span>
              </label>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <Link
                  to="/login?tab=worker"
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Cancel & Return to Worker Login
                </Link>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary w-full sm:w-auto px-8 py-3 text-sm shadow-lg shadow-blue-500/20"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Submitting Application...
                    </>
                  ) : (
                    <>
                      Submit Volunteer Application <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>

          </form>
        )}

      </div>
    </div>
  )
}
