import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  Camera, MapPin, Send, CheckCircle, AlertTriangle,
  Brain, X, RotateCcw, FileText
} from 'lucide-react'

const CATEGORIES = [
  { id: 'water_leakage',        label: 'Water Leakage',   emoji: '💧', color: 'bg-blue-100   border-blue-400   text-blue-700'   },
  { id: 'garbage_accumulation', label: 'Garbage Dump',    emoji: '🗑️', color: 'bg-gray-100   border-gray-400   text-gray-700'   },
  { id: 'broken_water_pipe',    label: 'Broken Pipe',     emoji: '🚰', color: 'bg-cyan-100   border-cyan-400   text-cyan-700'   },
  { id: 'drainage_blockage',    label: 'Drain Blockage',  emoji: '🕳️', color: 'bg-amber-100  border-amber-400  text-amber-700'  },
  { id: 'waterlogging',         label: 'Waterlogging',    emoji: '🌊', color: 'bg-indigo-100 border-indigo-400 text-indigo-700' },
  { id: 'illegal_dumping',      label: 'Illegal Dumping', emoji: '♻️', color: 'bg-green-100  border-green-400  text-green-700'  },
  { id: 'other',                label: 'Other Issue',     emoji: '💡', color: 'bg-purple-100 border-purple-400 text-purple-700' },
]

const AI_MOCK = {
  water_leakage:        { label: 'Water Pipeline Leak',    confidence: 0.94, severity: 'HIGH',     desc: 'Active water leakage detected from underground pipeline.' },
  garbage_accumulation: { label: 'Garbage Accumulation',   confidence: 0.91, severity: 'MODERATE', desc: 'Large accumulation of municipal solid waste posing health hazard.' },
  broken_water_pipe:    { label: 'Broken Water Pipe',      confidence: 0.97, severity: 'CRITICAL', desc: 'Burst pipe causing flooding and significant water loss.' },
  drainage_blockage:    { label: 'Drainage Blockage',      confidence: 0.89, severity: 'HIGH',     desc: 'Storm drain blocked with debris — overflow risk detected.' },
  waterlogging:         { label: 'Waterlogging / Flooding',confidence: 0.93, severity: 'HIGH',     desc: 'Severe waterlogging affecting road access.' },
  illegal_dumping:      { label: 'Illegal Waste Dumping',  confidence: 0.88, severity: 'MODERATE', desc: 'Unauthorized dumping detected at this location.' },
  other:                { label: 'Civic Issue',             confidence: 0.86, severity: 'LOW',      desc: 'General civic problem requiring municipal attention.' },
}

const SEVERITY_STYLE = {
  CRITICAL: 'bg-red-100    text-red-700    border-red-300',
  HIGH:     'bg-orange-100 text-orange-700 border-orange-300',
  MODERATE: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  LOW:      'bg-green-100  text-green-700  border-green-300',
}

export default function ComplaintForm({ onClose, embedded = false }) {
  const navigate  = useNavigate()
  const user      = JSON.parse(localStorage.getItem('civicfix_user') || '{}')
  const fileRef   = useRef()

  const [category,    setCategory]    = useState('')
  const [description, setDescription] = useState('')
  const [image,       setImage]       = useState(null)
  const [preview,     setPreview]     = useState(null)
  const [location,    setLocation]    = useState(null)
  const [locStatus,   setLocStatus]   = useState('idle') // idle | loading | done | error
  const [aiResult,    setAiResult]    = useState(null)
  const [aiLoading,   setAiLoading]   = useState(false)
  const [submitting,  setSubmitting]  = useState(false)
  const [submitted,   setSubmitted]   = useState(null)

  // Auto-grab GPS on mount
  useEffect(() => { grabGPS() }, [])

  const grabGPS = () => {
    setLocStatus('loading')
    if (!navigator.geolocation) { setLocStatus('error'); return }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocStatus('done')
      },
      () => {
        // Demo fallback — Kakinada
        setLocation({ lat: 16.9891, lng: 82.2475 })
        setLocStatus('done')
        toast('Using demo GPS location (Kakinada)', { icon: '📍' })
      },
      { timeout: 5000 }
    )
  }

  const handleCategoryChange = async (id) => {
    setCategory(id)
    setAiResult(null)
    setAiLoading(true)
    await new Promise(r => setTimeout(r, 1200)) // simulate AI latency
    setAiResult(AI_MOCK[id] || AI_MOCK.other)
    setAiLoading(false)
  }

  const handleImage = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImage(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!category)  { toast.error('Please select an issue type'); return }
    if (!location)  { toast.error('Location not available yet'); return }

    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('category',    category)
      fd.append('description', description)
      fd.append('latitude',    location.lat)
      fd.append('longitude',   location.lng)
      fd.append('user_id',     user.user_id || 1)
      if (image) fd.append('image', image)

      const { data } = await axios.post('/api/complaints/', fd)
      setSubmitted(data)
      toast.success(
        data.is_duplicate
          ? `Duplicate! Report count: ${data.report_count}`
          : `Submitted! ID: ${data.complaint_id}`
      )
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Submission failed. Is the backend running?')
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => {
    setCategory(''); setDescription(''); setImage(null)
    setPreview(null); setAiResult(null); setSubmitted(null)
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (submitted) {
    const c = submitted.complaint
    return (
      <div className={`${embedded ? '' : 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'}`}>
        <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-9 h-9 text-green-600" />
          </div>
          <h3 className="text-xl font-black text-slate-800">
            {submitted.is_duplicate ? 'Duplicate Detected' : 'Complaint Submitted!'}
          </h3>

          <div className="bg-slate-50 rounded-xl p-4 text-left text-sm space-y-2">
            <Row label="Complaint ID"  value={<span className="font-mono font-bold text-blue-600">{submitted.complaint_id}</span>} />
            {submitted.ai_analysis && <>
              <Row label="AI Detection"  value={submitted.ai_analysis.label} />
              <Row label="Confidence"    value={`${Math.round((submitted.ai_analysis.confidence||0)*100)}%`} />
              <Row label="Severity"      value={
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${SEVERITY_STYLE[submitted.ai_analysis.severity]}`}>
                  {submitted.ai_analysis.severity}
                </span>
              } />
            </>}
            {c?.ward_number      && <Row label="Ward"         value={`Ward ${c.ward_number}`} />}
            {c?.department_name  && <Row label="Department"   value={c.department_name} />}
            {c?.assigned_officer && <Row label="Officer"      value={c.assigned_officer} />}
            {c?.priority_score !== undefined && <Row label="Priority" value={`${c.priority_score}/100`} />}
            {submitted.is_duplicate && <Row label="Total Reports" value={submitted.report_count} />}
          </div>

          <div className="flex gap-2">
            <button onClick={() => navigate('/track')} className="btn-primary flex-1 text-sm">
              Track My Complaints
            </button>
            <button onClick={reset} className="btn-secondary flex-1 text-sm">
              New Report
            </button>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-slate-400 text-xs hover:underline">
              Close
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  const inner = (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-black text-slate-800">File a Complaint</h3>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        )}
      </div>

      {/* ── 1. Issue Type ── */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">
          1. Select Issue Type <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryChange(cat.id)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                category === cat.id
                  ? cat.color + ' shadow-sm scale-[1.02]'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
              }`}
            >
              <span className="text-2xl">{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── AI Analysis Panel ── */}
      {(aiLoading || aiResult) && (
        <div className={`rounded-xl border p-3 transition-all ${aiResult ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200 animate-pulse'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="text-xs font-bold text-blue-800">
              {aiLoading ? 'AI Analysing...' : 'AI Analysis Complete'}
            </span>
          </div>
          {aiResult && !aiLoading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-sm">{aiResult.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${SEVERITY_STYLE[aiResult.severity]}`}>
                  {aiResult.severity}
                </span>
              </div>
              <p className="text-xs text-slate-600">{aiResult.desc}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${Math.round(aiResult.confidence * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-blue-600">{Math.round(aiResult.confidence * 100)}%</span>
              </div>
            </div>
          )}
          {aiLoading && (
            <p className="text-xs text-slate-500">Classifying issue and estimating severity...</p>
          )}
        </div>
      )}

      {/* ── 2. Description ── */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">
          2. Description
          <span className="text-slate-400 font-normal ml-1">(optional but helpful)</span>
        </label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          placeholder="e.g. Large water pipe burst near the school gate, water flowing on road since morning..."
          className="input-field resize-none"
        />
      </div>

      {/* ── 3. Photo ── */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">3. Photo</label>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleImage}
        />
        {preview ? (
          <div className="relative">
            <img src={preview} alt="Issue" className="w-full h-40 object-cover rounded-xl border border-slate-200" />
            <button
              type="button"
              onClick={() => { setImage(null); setPreview(null) }}
              className="absolute top-2 right-2 bg-white shadow rounded-lg px-2 py-1 text-xs font-semibold text-red-600 flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Remove
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current.click()}
            className="w-full flex flex-col items-center gap-2 border-2 border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 rounded-xl py-6 transition-colors"
          >
            <Camera className="w-7 h-7 text-blue-400" />
            <span className="text-sm text-blue-600 font-semibold">Tap to take / upload photo</span>
            <span className="text-xs text-blue-400">AI will auto-analyse the image</span>
          </button>
        )}
      </div>

      {/* ── 4. GPS Location ── */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">4. Location (GPS)</label>
        <div className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm ${
          locStatus === 'done'    ? 'bg-green-50  border-green-300 text-green-700' :
          locStatus === 'loading' ? 'bg-yellow-50 border-yellow-300 text-yellow-700' :
                                    'bg-red-50    border-red-300   text-red-700'
        }`}>
          <MapPin className="w-4 h-4 shrink-0" />
          <span className="flex-1">
            {locStatus === 'loading' && 'Capturing GPS location...'}
            {locStatus === 'done'    && location && `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`}
            {locStatus === 'error'   && 'Location unavailable'}
            {locStatus === 'idle'    && 'Waiting...'}
          </span>
          {locStatus === 'done' && <CheckCircle className="w-4 h-4 text-green-600" />}
          {locStatus !== 'loading' && (
            <button type="button" onClick={grabGPS} className="ml-auto">
              <RotateCcw className="w-4 h-4 opacity-60 hover:opacity-100" />
            </button>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-1">Auto-captured. Used to route your complaint to the correct ward and department.</p>
      </div>

      {/* ── Submit ── */}
      <button
        type="submit"
        disabled={submitting || !category || locStatus === 'loading'}
        className="w-full btn-primary py-3 flex items-center justify-center gap-2 text-base"
      >
        {submitting
          ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting...</>
          : <><Send className="w-4 h-4" /> Submit Complaint</>
        }
      </button>

      {!category && (
        <p className="text-center text-xs text-slate-400">Select an issue type above to enable submission</p>
      )}
    </form>
  )

  // ── Embedded vs modal ───────────────────────────────────────────────────────
  if (embedded) return <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">{inner}</div>

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-5"
        onClick={e => e.stopPropagation()}
      >
        {inner}
      </div>
    </div>
  )
}

// Helper
function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-slate-500 shrink-0">{label}:</span>
      <span className="font-semibold text-slate-800 text-right">{value}</span>
    </div>
  )
}
