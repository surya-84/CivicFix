import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  Camera, Upload, MapPin, Brain, Send, Check, AlertTriangle,
  ArrowLeft, ArrowRight, ChevronRight, RefreshCw, ImageIcon, X
} from 'lucide-react'

const CATEGORIES = [
  { id: 'water_leakage',        label: 'Water Leakage',   emoji: '💧' },
  { id: 'garbage_accumulation', label: 'Garbage Dump',    emoji: '🗑️' },
  { id: 'broken_water_pipe',    label: 'Broken Pipe',     emoji: '🚰' },
  { id: 'drainage_blockage',    label: 'Drain Blockage',  emoji: '🕳️' },
  { id: 'waterlogging',         label: 'Waterlogging',    emoji: '🌊' },
  { id: 'illegal_dumping',      label: 'Illegal Dumping', emoji: '♻️' },
  { id: 'other',                label: 'Other Issue',     emoji: '💡' },
]

const AI_MOCK = {
  water_leakage:        { label:'Water Pipeline Leak',     confidence:0.94, severity:'HIGH',     explanation:['Active water flow from underground pipe detected','Pipe fracture pattern visible','Located near public utility zone','Water wastage risk critical'], recommendation:'Deploy Water Maintenance Team — Ward priority response' },
  garbage_accumulation: { label:'Garbage Accumulation',    confidence:0.91, severity:'MODERATE', explanation:['Multiple waste objects detected','Waste accumulation above threshold','Located on public roadside','Potential health hazard identified'], recommendation:'Sanitation team pickup recommended within 12 hours' },
  broken_water_pipe:    { label:'Broken Water Pipe',       confidence:0.97, severity:'CRITICAL', explanation:['Pipe burst with active flooding','Major infrastructure damage','Road obstruction risk detected','Emergency response required'], recommendation:'EMERGENCY — Deploy repair crew immediately' },
  drainage_blockage:    { label:'Drainage Blockage',       confidence:0.89, severity:'HIGH',     explanation:['Drain inlet fully obstructed','Water stagnation risk elevated','Mosquito breeding risk identified','Overflow imminent'], recommendation:'Drain clearance team — 6 hour response window' },
  waterlogging:         { label:'Waterlogging / Flooding', confidence:0.93, severity:'HIGH',     explanation:['Road surface submerged','Traffic disruption risk','Infrastructure damage risk','Waterlogging depth estimated 15cm+'], recommendation:'Drainage team + road safety barriers recommended' },
  illegal_dumping:      { label:'Illegal Waste Dumping',   confidence:0.88, severity:'MODERATE', explanation:['Non-municipal waste detected','Unauthorized disposal site','Environmental contamination risk','Legal action may be warranted'], recommendation:'Sanitation removal + area monitoring' },
  other:                { label:'Civic Issue',              confidence:0.82, severity:'LOW',      explanation:['Civic infrastructure anomaly detected','Requires municipal assessment','Area flagged for inspection'], recommendation:'Municipal assessment team recommended' },
}

const SEV_STYLE = {
  CRITICAL: 'bg-red-100 text-red-700 border-red-300',
  HIGH:     'bg-orange-100 text-orange-700 border-orange-300',
  MODERATE: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  LOW:      'bg-green-100 text-green-700 border-green-300',
}

const SEV_BAR = {
  CRITICAL: 'bg-red-500',
  HIGH:     'bg-orange-500',
  MODERATE: 'bg-yellow-500',
  LOW:      'bg-green-500',
}

const STEPS = ['Capture', 'AI Analysis', 'Location', 'Preview', 'Done']

export default function ReportIssue() {
  const navigate             = useNavigate()
  const [params]             = useSearchParams()
  const user                 = JSON.parse(localStorage.getItem('civicfix_user') || '{}')
  const fileRef              = useRef()

  const [step, setStep]           = useState(0)
  const [image, setImage]         = useState(null)
  const [preview, setPreview]     = useState(null)
  const [category, setCategory]   = useState(params.get('category') || '')
  const [description, setDesc]    = useState('')
  const [aiResult, setAiResult]   = useState(null)
  const [aiProgress, setAiProgress] = useState(0)
  const [aiStage, setAiStage]     = useState('')
  const [location, setLocation]   = useState(null)
  const [locStatus, setLocStatus] = useState('idle')
  const [ward, setWard]           = useState(null)
  const [duplicate, setDuplicate] = useState(null)
  const [priorityScore, setPriority] = useState(0)
  const [priorityAnim, setPriorityAnim] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(null)

  // If category param pre-set, jump to capture
  useEffect(() => {
    if (params.get('category')) setCategory(params.get('category'))
  }, [])

  // GPS on step 2
  useEffect(() => {
    if (step === 2) grabGPS()
  }, [step])

  // Priority animation on step 3
  useEffect(() => {
    if (step === 3 && priorityScore > 0) {
      let n = 0
      const interval = setInterval(() => {
        n += 2
        setPriorityAnim(n)
        if (n >= priorityScore) clearInterval(interval)
      }, 20)
      return () => clearInterval(interval)
    }
  }, [step, priorityScore])

  // ── AI simulation ──────────────────────────────────────────────────────────
  const runAI = useCallback(async (cat) => {
    setAiProgress(0)
    setAiResult(null)
    const stages = ['Detecting civic issue...', 'Analysing severity...', 'Checking location risk...', 'Finalising report...']
    for (let i = 0; i < stages.length; i++) {
      setAiStage(stages[i])
      for (let p = (i * 25); p <= ((i + 1) * 25); p++) {
        await new Promise(r => setTimeout(r, 18))
        setAiProgress(p)
      }
    }
    setAiProgress(100)
    await new Promise(r => setTimeout(r, 300))
    const result = AI_MOCK[cat] || AI_MOCK.other
    setAiResult(result)
    // Compute priority score
    const sev = { CRITICAL: 90, HIGH: 75, MODERATE: 55, LOW: 35 }
    setPriority(sev[result.severity] || 50)
  }, [])

  const handleImage = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImage(file)
    setPreview(URL.createObjectURL(file))
    const cat = category || 'other'
    if (!category) setCategory('other')
    setStep(1)
    await runAI(cat)
  }

  const handleCategorySelect = async (id) => {
    setCategory(id)
    if (preview) {
      setStep(1)
      await runAI(id)
    }
  }

  const grabGPS = () => {
    setLocStatus('loading')
    navigator.geolocation?.getCurrentPosition(
      pos => {
        const l = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setLocation(l)
        setLocStatus('done')
        lookupWard(l.lat, l.lng)
      },
      () => {
        const l = { lat: 16.9891, lng: 82.2475 }
        setLocation(l)
        setLocStatus('done')
        setWard({ ward_number: '3', ward_name: 'Central Ward', municipality: 'Kakinada MC', department: 'Water Works Dept', officer: 'Sri Venkat Rao' })
        toast('Using demo GPS location', { icon: '📍' })
      },
      { timeout: 5000 }
    )
  }

  const lookupWard = async (lat, lng) => {
    try {
      const { data } = await axios.get('/api/wards/lookup', { params: { lat, lng } })
      setWard(data)
    } catch {
      setWard({ ward_number: '3', ward_name: 'Central Ward', municipality: 'Kakinada MC', department: 'Water Works Dept', officer: 'Sri Venkat Rao' })
    }
  }

  const checkDuplicate = async () => {
    try {
      const { data } = await axios.get('/api/complaints/', { params: { limit: 20 } })
      const dupe = data.find(c => c.category === category && c.status !== 'resolved')
      if (dupe) setDuplicate(dupe)
    } catch { /* silent */ }
  }

  const goToPreview = async () => {
    await checkDuplicate()
    setStep(3)
  }

  const handleSubmit = async () => {
    if (!location) { toast.error('Location required'); return }
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
      setStep(4)
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Submission failed. Check backend.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Step indicators ────────────────────────────────────────────────────────
  const StepBar = () => (
    <div className="flex items-center gap-1 mb-5">
      {STEPS.slice(0, 4).map((s, i) => (
        <div key={s} className="flex items-center flex-1">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all shrink-0 ${
            i < step  ? 'bg-blue-600 border-blue-600 text-white' :
            i === step ? 'border-blue-600 bg-white text-blue-600' :
                         'border-slate-300 bg-white text-slate-400'
          }`}>
            {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
          </div>
          {i < 3 && <div className={`flex-1 h-0.5 mx-1 transition-colors ${i < step ? 'bg-blue-600' : 'bg-slate-200'}`} />}
        </div>
      ))}
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-0">
      <div className="max-w-lg mx-auto px-4 pt-5">

        {/* Back + Title */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => step > 0 ? setStep(step - 1) : navigate('/home')}
            className="w-8 h-8 rounded-lg hover:bg-slate-200 flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <h2 className="text-lg font-black text-slate-800">Report an Issue</h2>
        </div>

        {step < 4 && <StepBar />}

        {/* ── STEP 0: CAPTURE ── */}
        {step === 0 && (
          <div className="space-y-4">
            <input
              ref={fileRef} type="file" accept="image/*" capture="environment"
              className="hidden" onChange={handleImage}
            />

            {!preview ? (
              <div className="space-y-3">
                <button
                  onClick={() => { fileRef.current.setAttribute('capture', 'environment'); fileRef.current.click() }}
                  className="w-full flex flex-col items-center gap-3 py-12 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 active:scale-[0.98] transition-all"
                >
                  <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-blue-700">Take a Photo</p>
                    <p className="text-xs text-blue-500 mt-0.5">Capture the civic issue</p>
                  </div>
                </button>

                <button
                  onClick={() => { fileRef.current.removeAttribute('capture'); fileRef.current.click() }}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700 active:scale-[0.98] transition-all"
                >
                  <Upload className="w-4 h-4" />
                  Upload from Gallery
                </button>

                <div className="text-center text-xs text-slate-400">— or select issue type first —</div>

                {/* Category quick-select */}
                <div className="grid grid-cols-4 gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => { setCategory(cat.id); fileRef.current.click() }}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all active:scale-95 ${
                        category === cat.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xl">{cat.emoji}</span>
                      <span className="text-[9px] font-bold text-slate-600">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <img src={preview} alt="Issue" className="w-full h-56 object-cover rounded-2xl" />
                  <button
                    onClick={() => { setImage(null); setPreview(null) }}
                    className="absolute top-2 right-2 bg-black/50 text-white rounded-lg p-1.5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">Description (optional)</label>
                  <textarea
                    value={description} onChange={e => setDesc(e.target.value)}
                    rows={3} placeholder="Describe the issue..."
                    className="input-field resize-none"
                  />
                </div>
                <button onClick={() => { setStep(1); runAI(category || 'other') }} className="btn-primary w-full">
                  Analyse with AI <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 1: AI ANALYSIS ── */}
        {step === 1 && (
          <div className="space-y-4">
            {preview && (
              <img src={preview} alt="Issue" className="w-full h-40 object-cover rounded-2xl" />
            )}

            {!aiResult ? (
              <div className="card space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Brain className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">AI Analysing Image</p>
                    <p className="text-xs text-slate-500">{aiStage}</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                    <span>Processing</span>
                    <span className="font-bold text-blue-600">{aiProgress}%</span>
                  </div>
                  <div className="bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-100"
                      style={{ width: `${aiProgress}%` }}
                    />
                  </div>
                </div>

                {/* Stage indicators */}
                {['Detecting civic issue', 'Analysing severity', 'Checking location risk', 'Finalising report'].map((s, i) => {
                  const done = aiProgress > i * 25 + 25
                  const active = aiProgress > i * 25 && !done
                  return (
                    <div key={s} className={`flex items-center gap-2 text-sm transition-all ${done ? 'text-green-600' : active ? 'text-blue-600 font-semibold' : 'text-slate-400'}`}>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${done ? 'bg-green-500 border-green-500' : active ? 'border-blue-500 animate-pulse' : 'border-slate-300'}`}>
                        {done && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      {s}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="space-y-3">
                {/* AI Result */}
                <div className="card space-y-3">
                  <div className="flex items-center gap-2 text-green-600">
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm font-bold">AI Analysis Complete</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xl font-black text-slate-800">{aiResult.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {CATEGORIES.find(c => c.id === category)?.emoji} {CATEGORIES.find(c => c.id === category)?.label}
                      </p>
                    </div>
                    <span className={`badge border ${SEV_STYLE[aiResult.severity]} text-sm`}>
                      {aiResult.severity}
                    </span>
                  </div>

                  {/* Confidence */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Confidence Score</span>
                      <span className="font-bold text-blue-600">{Math.round(aiResult.confidence * 100)}%</span>
                    </div>
                    <div className="bg-slate-100 rounded-full h-2">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${Math.round(aiResult.confidence * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* AI explanation */}
                  <div>
                    <p className="text-xs font-bold text-slate-600 mb-2">Why AI classified this:</p>
                    <div className="space-y-1">
                      {aiResult.explanation.map((e, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                          <Check className="w-3 h-3 text-green-500 shrink-0 mt-0.5" />
                          {e}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div className="bg-blue-50 rounded-xl p-3">
                    <p className="text-xs font-bold text-blue-700 mb-0.5">AI Recommendation:</p>
                    <p className="text-xs text-blue-600">{aiResult.recommendation}</p>
                  </div>
                </div>

                {/* Category override */}
                <details className="card cursor-pointer">
                  <summary className="text-sm font-semibold text-slate-600 list-none flex items-center justify-between">
                    Looks wrong? Change category
                    <ChevronRight className="w-4 h-4" />
                  </summary>
                  <div className="grid grid-cols-4 gap-1.5 mt-3">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => handleCategorySelect(cat.id)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-center transition-all ${
                          category === cat.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-lg">{cat.emoji}</span>
                        <span className="text-[9px] font-bold text-slate-600">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </details>

                <button onClick={() => setStep(2)} className="btn-primary w-full">
                  Continue to Location <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: LOCATION ── */}
        {step === 2 && (
          <div className="space-y-4">
            {locStatus === 'loading' && (
              <div className="card text-center py-10 space-y-3">
                <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
                  <MapPin className="w-7 h-7 text-blue-600" />
                </div>
                <p className="font-bold text-slate-700">Detecting Location…</p>
                <p className="text-sm text-slate-500">Capturing GPS coordinates</p>
              </div>
            )}

            {locStatus === 'done' && location && (
              <div className="space-y-3">
                <div className="card space-y-3">
                  <div className="flex items-center gap-2 text-green-700">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <p className="font-bold">Location Detected</p>
                  </div>

                  <div className="bg-green-50 rounded-xl p-3 space-y-1.5 text-sm">
                    <p className="font-bold text-slate-800">
                      {ward?.ward_name || 'Central Ward'}, Kakinada Municipality
                    </p>
                    <p className="text-slate-500 text-xs">Accuracy: ±8 meters</p>
                    <p className="text-slate-500 text-xs font-mono">{location.lat.toFixed(5)}°N, {location.lng.toFixed(5)}°E</p>
                  </div>

                  {/* GIS routing confirmation */}
                  <div className="space-y-2">
                    {[
                      `Ward identified: ${ward?.ward_number || '3'} — ${ward?.ward_name || 'Central Ward'}`,
                      `Municipality: ${ward?.municipality || 'Kakinada MC'}`,
                      `Department: ${ward?.department || 'Water Works Dept'}`,
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                        <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <button onClick={() => setLocStatus('idle')} className="btn-secondary w-full text-sm">
                  <RefreshCw className="w-3.5 h-3.5" /> Retry GPS
                </button>

                <button onClick={goToPreview} className="btn-primary w-full">
                  Preview & Submit <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {locStatus === 'idle' && (
              <button onClick={grabGPS} className="btn-primary w-full">
                <MapPin className="w-4 h-4" /> Capture GPS Location
              </button>
            )}
          </div>
        )}

        {/* ── STEP 3: PRIORITY PREVIEW ── */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Duplicate warning */}
            {duplicate && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="w-5 h-5" />
                  <p className="font-bold text-sm">Similar Issue Found Nearby</p>
                </div>
                <p className="text-xs text-amber-700">
                  Another citizen reported a similar <b>{duplicate.category?.replace('_',' ')}</b> issue near your location.
                </p>
                <p className="font-mono text-xs text-amber-800 bg-amber-100 rounded-lg px-2 py-1 inline-block">
                  {duplicate.id}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => navigate('/track')} className="flex-1 btn-secondary text-sm py-2">
                    View Existing
                  </button>
                  <button onClick={() => setDuplicate(null)} className="flex-1 btn-primary text-sm py-2">
                    Report Anyway
                  </button>
                </div>
              </div>
            )}

            {/* Priority score */}
            <div className="card text-center space-y-3">
              <p className="section-title">Civic Priority Score</p>
              <div className="relative w-28 h-28 mx-auto">
                <svg viewBox="0 0 120 120" className="w-28 h-28 -rotate-90">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                  <circle
                    cx="60" cy="60" r="50" fill="none"
                    stroke={priorityScore >= 80 ? '#ef4444' : priorityScore >= 60 ? '#f97316' : '#3b82f6'}
                    strokeWidth="12"
                    strokeDasharray={`${2 * Math.PI * 50}`}
                    strokeDashoffset={`${2 * Math.PI * 50 * (1 - priorityAnim / 100)}`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.05s' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center rotate-0">
                  <span className="text-2xl font-black text-slate-800">{priorityAnim}</span>
                </div>
              </div>

              <span className={`badge border text-sm ${SEV_STYLE[aiResult?.severity || 'MODERATE']}`}>
                {aiResult?.severity || 'MODERATE'} PRIORITY
              </span>

              <div className="space-y-1.5 text-left">
                {['High severity classification', 'Located on public road', `${duplicate ? 'Multiple reports in area' : 'First report in area'}`].map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    {r}
                  </div>
                ))}
              </div>
            </div>

            {/* Review summary */}
            <div className="card space-y-2 text-sm">
              <p className="font-bold text-slate-700 mb-2">Complaint Summary</p>
              {[
                ['Category', CATEGORIES.find(c => c.id === category)?.label || category],
                ['AI Label', aiResult?.label],
                ['Ward', ward?.ward_number ? `Ward ${ward.ward_number}` : 'Ward 3'],
                ['Department', ward?.department || 'Water Works Dept'],
              ].filter(([,v]) => v).map(([k,v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-slate-500">{k}</span>
                  <span className="font-semibold text-slate-800 text-right">{v}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-primary w-full py-3 text-base"
            >
              {submitting
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting…</>
                : <><Send className="w-4 h-4" /> Submit Complaint</>
              }
            </button>
          </div>
        )}

        {/* ── STEP 4: SUCCESS ── */}
        {step === 4 && submitted && (
          <div className="space-y-4 text-center">
            {/* Celebration */}
            <div className="relative py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-10 h-10 text-green-600" />
              </div>
              {/* Confetti dots */}
              {['bg-blue-400','bg-yellow-400','bg-red-400','bg-green-400','bg-purple-400','bg-pink-400'].map((c,i) => (
                <div
                  key={i}
                  className={`confetti-dot ${c}`}
                  style={{
                    left: `${20 + i * 12}%`,
                    top: '50%',
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: `${1 + i * 0.15}s`,
                  }}
                />
              ))}
            </div>

            <div>
              <h3 className="text-2xl font-black text-slate-800">
                {submitted.is_duplicate ? 'Duplicate Detected!' : 'Complaint Filed!'}
              </h3>
              <p className="text-slate-500 text-sm mt-1">
                Your complaint has been routed to the {ward?.department || 'concerned department'}
              </p>
            </div>

            {/* Complaint ID */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-2 text-left">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Complaint ID</span>
                <span className="font-mono font-black text-blue-700 text-lg">{submitted.complaint_id}</span>
              </div>
              {submitted.ai_analysis && (
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">AI Detection</span>
                  <span className="text-sm font-semibold">{submitted.ai_analysis.label}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">Priority</span>
                <span className="text-sm font-bold text-orange-600">{submitted.complaint?.priority_score || priorityScore}/100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">Expected Response</span>
                <span className="text-sm font-semibold text-green-600">Within 24 hours</span>
              </div>
              {submitted.is_duplicate && (
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Total Reports</span>
                  <span className="text-sm font-bold">{submitted.report_count} citizens</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={() => navigate('/track')} className="btn-primary flex-1">
                Track Complaint
              </button>
              <button
                onClick={() => { setStep(0); setImage(null); setPreview(null); setAiResult(null); setSubmitted(null); setDuplicate(null); setCategory('') }}
                className="btn-secondary flex-1"
              >
                Report Another
              </button>
            </div>

            {/* Civic Volunteer Force Invitation */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0b3e34] to-[#0a2f27] text-white flex flex-col sm:flex-row items-center justify-between gap-3 text-left shadow-md border border-emerald-700/40 mt-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                  <span>🤝 Civic Volunteer Force</span>
                </div>
                <p className="text-xs font-bold text-white">Want to help your city? Become a volunteer.</p>
                <p className="text-[10px] text-emerald-100/80">Join municipal teams, resolve reported issues, and earn verified credentials.</p>
              </div>
              <button
                onClick={() => navigate('/volunteer-register')}
                className="shrink-0 px-3.5 py-2 bg-white text-[#0a332a] font-extrabold text-[11px] rounded-full shadow hover:bg-slate-100 transition whitespace-nowrap"
              >
                Apply as Volunteer →
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
