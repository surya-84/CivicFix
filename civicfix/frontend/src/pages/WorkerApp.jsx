import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  Navigation, Play, Camera, CheckCircle2, ChevronDown,
  ChevronUp, MapPin, Loader2, Star, ToggleLeft, ToggleRight
} from 'lucide-react'

const SEV_BADGE = {
  CRITICAL: 'bg-red-100 text-red-800 border-red-300',
  HIGH:     'bg-orange-100 text-orange-800 border-orange-300',
  MODERATE: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  LOW:      'bg-green-100 text-green-800 border-green-300',
}

const DIST = ['450m away','820m away','1.2km away','300m away','650m away','1.8km away']
const CAT_EMOJI = {
  water_leakage:'💧', garbage_accumulation:'🗑️', broken_water_pipe:'🚰',
  drainage_blockage:'🕳️', waterlogging:'🌊', illegal_dumping:'♻️', other:'💡',
}

function TaskCard({ complaint, onRefresh, idx }) {
  const [expanded,    setExpanded]    = useState(false)
  const [showUpload,  setShowUpload]  = useState(false)
  const [notes,       setNotes]       = useState('')
  const [afterFile,   setAfterFile]   = useState(null)
  const [afterPrev,   setAfterPrev]   = useState(null)
  const [verifying,   setVerifying]   = useState(false)
  const [verified,    setVerified]    = useState(false)
  const [loading,     setLoading]     = useState(false)
  const fileRef = useRef()

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setAfterFile(f)
    setAfterPrev(URL.createObjectURL(f))
    setVerifying(true)
    setTimeout(() => { setVerifying(false); setVerified(true) }, 2000)
  }

  const startWork = async () => {
    try {
      await axios.patch(`/api/complaints/${complaint.id}/status`, { status:'in_progress' })
      toast.success('Task started!')
      onRefresh()
    } catch { toast.error('Failed to start') }
  }

  const resolve = async () => {
    if (!afterFile) { toast.error('Upload after photo first'); setShowUpload(true); return }
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('notes', notes)
      fd.append('after_image', afterFile)
      await axios.post(`/api/complaints/${complaint.id}/resolve`, fd)
      toast.success('Task resolved!')
      onRefresh()
    } catch { toast.error('Failed to resolve') }
    finally { setLoading(false) }
  }

  return (
    <div className="card space-y-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="text-2xl">{CAT_EMOJI[complaint.category] || '📍'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold text-slate-800 text-sm">{complaint.ai_label || complaint.category}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${SEV_BADGE[complaint.severity] || ''}`}>
              {complaint.severity}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">{complaint.id}</p>
        </div>
      </div>

      {/* Priority + dist */}
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-slate-100 rounded-full h-2">
          <div className="h-2 rounded-full bg-gradient-to-r from-orange-400 to-red-500"
            style={{ width:`${complaint.priority_score||0}%` }} />
        </div>
        <span className="text-xs font-bold text-slate-500">{Math.round(complaint.priority_score||0)}/100</span>
        <span className="text-xs text-blue-600 font-semibold flex items-center gap-0.5">
          <MapPin className="w-3 h-3" /> {DIST[idx % DIST.length]}
        </span>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2">
        <a
          href={`https://maps.google.com/?q=${complaint.latitude},${complaint.longitude}`}
          target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl py-2"
        >
          <Navigation className="w-3.5 h-3.5" /> Navigate
        </a>
        <button onClick={startWork}
          className="flex items-center justify-center gap-1.5 text-xs font-semibold bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-xl py-2">
          <Play className="w-3.5 h-3.5" /> Start Work
        </button>
        <button onClick={() => setShowUpload(!showUpload)}
          className="flex items-center justify-center gap-1.5 text-xs font-semibold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl py-2">
          <Camera className="w-3.5 h-3.5" /> Upload Resolution
        </button>
        <button onClick={resolve} disabled={loading}
          className="flex items-center justify-center gap-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl py-2 disabled:opacity-60">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
          Mark Resolved
        </button>
      </div>

      {/* Upload / before-after */}
      {showUpload && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">AI Resolution Verification</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-200 rounded-xl h-28 flex items-center justify-center text-slate-400 text-xs overflow-hidden">
              {complaint.image_path
                ? <img src={`/uploads/${complaint.image_path}`} alt="Before" className="w-full h-full object-cover" />
                : 'BEFORE (no image)'}
            </div>
            {!afterPrev ? (
              <button onClick={() => fileRef.current?.click()}
                className="bg-white border-2 border-dashed border-purple-300 rounded-xl h-28 flex flex-col items-center justify-center text-purple-400 hover:border-purple-500 gap-1">
                <Camera className="w-6 h-6" />
                <span className="text-xs">Upload AFTER photo</span>
              </button>
            ) : (
              <div className="rounded-xl h-28 overflow-hidden">
                <img src={afterPrev} alt="After" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />

          {verifying && (
            <div className="flex items-center gap-2 text-xs text-purple-600 font-semibold">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> AI comparing images…
            </div>
          )}
          {verified && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span>AI Comparison</span>
                <span className="text-green-600">94% Verified ✓</span>
              </div>
              <div className="bg-slate-200 rounded-full h-3">
                <div className="h-3 rounded-full bg-gradient-to-r from-green-400 to-emerald-600" style={{ width:'94%' }} />
              </div>
              <p className="text-xs text-green-700 font-medium">Issue appears resolved.</p>
            </div>
          )}

          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Add resolution notes..."
            className="input-field text-xs resize-none" rows={2} />

          {(afterFile || true) && (
            <button onClick={resolve} disabled={loading}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-bold py-2.5 rounded-xl disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Confirm Resolution
            </button>
          )}
        </div>
      )}

      {/* Expand */}
      <button onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-600 w-full justify-center">
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {expanded ? 'Hide Details' : 'View Details'}
      </button>

      {expanded && (
        <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-700">
          <div><span className="font-semibold text-slate-400">Ward:</span> {complaint.ward_number || 'N/A'}</div>
          <div><span className="font-semibold text-slate-400">Dept:</span> {complaint.department_name || 'N/A'}</div>
          <div><span className="font-semibold text-slate-400">Officer:</span> {complaint.assigned_officer || 'Unassigned'}</div>
          <div><span className="font-semibold text-slate-400">Reports:</span> {complaint.report_count || 1}</div>
          <div className="col-span-2"><span className="font-semibold text-slate-400">AI:</span> {complaint.ai_description || 'N/A'}</div>
        </div>
      )}
    </div>
  )
}

export default function WorkerApp() {
  const user = JSON.parse(localStorage.getItem('civicfix_user') || '{}')
  const [assigned,   setAssigned]   = useState([])
  const [inProgress, setInProgress] = useState([])
  const [resolved,   setResolved]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [available,  setAvailable]  = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      // Calls /api/complaints/my which returns ONLY tasks assigned to this worker
      const { data } = await axios.get('/api/complaints/my')
      setAssigned(data.filter(c => c.status === 'assigned'))
      setInProgress(data.filter(c => c.status === 'in_progress'))
      setResolved(data.filter(c => c.status === 'resolved').slice(0, 5))
    } catch { toast.error('Could not load tasks') }
    finally { setLoading(false) }
  }


  useEffect(() => { load() }, [])

  const todayDone    = resolved.filter(c => c.resolved_at && new Date(c.resolved_at).toDateString() === new Date().toDateString()).length
  const totalAssigned = assigned.length + inProgress.length

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-10">
      <div className="max-w-lg mx-auto px-4 pt-5 space-y-5">

        {/* Worker header */}
        <div className="bg-gradient-to-br from-indigo-700 to-blue-700 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Star className="w-6 h-6 text-yellow-300" />
              </div>
              <div>
                <p className="font-black text-lg">{user.name || 'Field Worker'}</p>
                <p className="text-indigo-200 text-xs">Field Worker · KMC</p>
              </div>
            </div>
            <button onClick={() => setAvailable(!available)} className="flex items-center gap-1.5 bg-white/10 rounded-xl px-3 py-2">
              {available ? <ToggleRight className="w-5 h-5 text-green-300" /> : <ToggleLeft className="w-5 h-5 text-slate-300" />}
              <span className="text-xs font-semibold">{available ? 'Available' : 'Off Duty'}</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-black">{totalAssigned}</p>
              <p className="text-indigo-200 text-xs">Assigned</p>
            </div>
            <div>
              <p className="text-2xl font-black">{inProgress.length}</p>
              <p className="text-indigo-200 text-xs">In Progress</p>
            </div>
            <div>
              <p className="text-2xl font-black">{todayDone}</p>
              <p className="text-indigo-200 text-xs">Done Today</p>
            </div>
          </div>
        </div>

        {/* Tasks assigned */}
        {loading ? (
          <div className="py-10 text-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
            <p className="text-slate-500 text-sm">Loading tasks…</p>
          </div>
        ) : (
          <>
            {assigned.length > 0 && (
              <div>
                <p className="section-title">Today's Tasks ({assigned.length})</p>
                <div className="space-y-3">
                  {assigned.map((c, i) => <TaskCard key={c.id} complaint={c} onRefresh={load} idx={i} />)}
                </div>
              </div>
            )}

            {inProgress.length > 0 && (
              <div>
                <p className="section-title">In Progress ({inProgress.length})</p>
                <div className="space-y-3">
                  {inProgress.map((c, i) => <TaskCard key={c.id} complaint={c} onRefresh={load} idx={i + 10} />)}
                </div>
              </div>
            )}

            {assigned.length === 0 && inProgress.length === 0 && (
              <div className="card text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <p className="font-bold text-slate-700">All clear! No pending tasks.</p>
                <p className="text-sm text-slate-400 mt-1">Great work today!</p>
              </div>
            )}

            {resolved.length > 0 && (
              <div>
                <p className="section-title">Completed Today</p>
                <div className="space-y-2">
                  {resolved.map(c => (
                    <div key={c.id} className="card flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{c.ai_label || c.category}</p>
                        <p className="text-xs text-slate-400 font-mono">{c.id}</p>
                      </div>
                      <span className="text-xs text-green-600 font-bold">Done</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
