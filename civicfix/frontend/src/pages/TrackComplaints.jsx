import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  RefreshCw, ThumbsUp, ThumbsDown, MapPin, Clock,
  Users, ChevronDown, ChevronUp, Brain, ShieldCheck,
  History, UserCheck, Wrench
} from 'lucide-react'
import SkeletonCard from '../components/SkeletonCard'

const CAT_EMOJI = {
  water_leakage:'💧', garbage_accumulation:'🗑️', broken_water_pipe:'🚰',
  drainage_blockage:'🕳️', waterlogging:'🌊', illegal_dumping:'♻️', other:'💡'
}
const SEV_STYLE = { CRITICAL:'badge-red', HIGH:'badge-orange', MODERATE:'badge-yellow', LOW:'badge-green' }

const TIMELINE_STEPS = [
  { key: 'reported',    label: 'Reported',     subLabel: 'Received by system' },
  { key: 'verified',    label: 'AI Verified',  subLabel: 'Classified & prioritized' },
  { key: 'assigned',    label: 'Assigned',     subLabel: 'Worker allocated' },
  { key: 'in_progress', label: 'In Progress',  subLabel: 'Repair underway' },
  { key: 'resolved',    label: 'Resolved',     subLabel: 'Issue fixed' },
]

function stepIndex(status) {
  if (status === 'pending')     return 1
  if (status === 'assigned')    return 2
  if (status === 'in_progress') return 3
  if (status === 'resolved')    return 4
  return 1
}

const TABS = ['All', 'Pending', 'In Progress', 'Resolved']

export default function TrackComplaints() {
  const user = JSON.parse(localStorage.getItem('civicfix_user') || '{}')
  const [complaints, setComplaints] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [activeTab,  setActiveTab]  = useState('All')
  const [expanded,   setExpanded]   = useState(null)
  const [feedback,   setFeedback]   = useState({})
  const [histories,  setHistories]  = useState({})

  const load = async () => {
    setLoading(true)
    try {
      // Calls /api/complaints/my which strictly enforces RBAC at the backend/database level
      const { data } = await axios.get('/api/complaints/my')
      setComplaints(data)
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not load complaints')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleToggleExpand = async (cid) => {
    if (expanded === cid) {
      setExpanded(null)
      return
    }
    setExpanded(cid)
    if (!histories[cid]) {
      try {
        const { data } = await axios.get(`/api/complaints/${cid}/history`)
        setHistories(prev => ({ ...prev, [cid]: data }))
      } catch {
        // silent fallback
      }
    }
  }

  const filtered = complaints.filter(c => {
    if (activeTab === 'All')         return true
    if (activeTab === 'Pending')     return c.status === 'pending'
    if (activeTab === 'In Progress') return ['assigned', 'in_progress'].includes(c.status)
    if (activeTab === 'Resolved')    return c.status === 'resolved'
    return true
  })

  const sendFeedback = async (id, rating) => {
    try {
      await axios.post(`/api/complaints/${id}/feedback`, { rating })
      setFeedback(p => ({ ...p, [id]: rating }))
      toast.success(rating === 1 ? '👍 Thanks! Marked as resolved.' : '🔄 Complaint reopened for review')
      load()
    } catch {
      toast.error('Failed to submit feedback')
    }
  }

  const role = user?.role || 'citizen'
  const title = role === 'admin' ? 'All Municipal Complaints' : role === 'worker' ? 'Assigned Field Tasks' : 'My Complaints'

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-12">
      <div className="max-w-xl mx-auto px-4 pt-6 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800">{title}</h1>
            <p className="text-xs text-slate-500 mt-0.5">{complaints.length} records available</p>
          </div>
          <button onClick={load} className="btn-ghost text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-sm">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {/* Privacy Assurance Banner */}
        <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-emerald-900">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">Privacy Protected: </span>
            {role === 'citizen' ? (
              <span>Only your own submitted complaints are shown. No other citizen can view your contact or issue details.</span>
            ) : role === 'worker' ? (
              <span>Only complaints assigned to your field worker profile are shown.</span>
            ) : (
              <span>Municipal Command View: Authorized access to all city complaints across wards.</span>
            )}
          </div>
        </div>

        {/* Tab filter */}
        <div className="flex gap-1 bg-slate-200/80 rounded-2xl p-1">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab ? 'bg-white shadow text-blue-700' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <SkeletonCard key={i} lines={3} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-16 space-y-3">
            <span className="text-4xl">📋</span>
            <h3 className="font-bold text-slate-700 text-base">No complaints found</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              {activeTab === 'All'
                ? 'You have not submitted any complaints yet. Use the Report Issue button to file one.'
                : `No complaints in "${activeTab}" state.`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(c => {
              const sIdx    = stepIndex(c.status)
              const isOpen  = expanded === c.id
              const historyList = histories[c.id] || []

              return (
                <div key={c.id} className="card space-y-3 hover:shadow-md transition-shadow border-slate-200">
                  {/* Top row */}
                  <div
                    className="flex items-start gap-3 cursor-pointer"
                    onClick={() => handleToggleExpand(c.id)}
                  >
                    <span className="text-2xl mt-0.5">{CAT_EMOJI[c.category] || '📍'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-slate-800 text-sm">{c.ai_label || c.category}</p>
                        <span className={`badge text-[10px] capitalize ${SEV_STYLE[c.severity] || 'badge-blue'}`}>
                          {c.severity}
                        </span>
                        {c.status === 'reopened' && (
                          <span className="badge text-[10px] bg-red-100 text-red-700 border-red-300">
                            REOPENED
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-[10px] text-slate-400 mt-0.5">{c.id}</p>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                  </div>

                  {/* ── Swiggy-style timeline ── */}
                  <div className="relative pl-6 space-y-0 pt-1">
                    {TIMELINE_STEPS.map((s, i) => {
                      const done    = i < sIdx
                      const current = i === sIdx
                      const pending = i > sIdx
                      return (
                        <div key={s.key} className="relative flex items-start gap-3 pb-3 last:pb-0">
                          {/* Vertical connector */}
                          {i < TIMELINE_STEPS.length - 1 && (
                            <div className={`absolute left-[-14px] top-5 w-0.5 h-full ${done ? 'bg-blue-500' : 'bg-slate-200'}`} />
                          )}
                          {/* Circle */}
                          <div className={`absolute left-[-18px] top-1 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            done    ? 'bg-blue-600 border-blue-600' :
                            current ? 'bg-white border-blue-600 ring-2 ring-blue-100 animate-pulse' :
                                      'bg-white border-slate-300'
                          }`}>
                            {done && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                            {current && <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />}
                          </div>
                          {/* Label */}
                          <div className={`${pending ? 'opacity-40' : ''}`}>
                            <p className={`text-xs font-bold ${current ? 'text-blue-600 font-black' : done ? 'text-slate-700' : 'text-slate-400'}`}>
                              {s.label}
                            </p>
                            {(done || current) && (
                              <p className="text-[10px] text-slate-400">{s.subLabel}</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Meta chips */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                    {c.ward_number && <span className="flex items-center gap-1 font-semibold"><MapPin className="w-3 h-3 text-blue-500" /> Ward {c.ward_number}</span>}
                    {c.report_count > 1 && <span className="flex items-center gap-1"><Users className="w-3 h-3 text-indigo-500" /> {c.report_count} citizen reports</span>}
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-slate-400" /> {c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN') : '—'}</span>
                    <span className="ml-auto font-black text-blue-600">Priority {c.priority_score}/100</span>
                  </div>

                  {/* ── EXPANDED DETAIL & STATUS HISTORY ── */}
                  {isOpen && (
                    <div className="space-y-3 pt-3 border-t border-slate-100 animate-in fade-in duration-150">
                      {/* AI info */}
                      {c.ai_description && (
                        <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-3.5 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <Brain className="w-4 h-4 text-blue-600" />
                            <p className="text-xs font-bold text-blue-800">AI Classification & Confidence</p>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed">{c.ai_description}</p>
                          {c.ai_confidence && (
                            <div className="pt-1">
                              <div className="flex justify-between text-[10px] text-blue-700 font-bold mb-1">
                                <span>AI Confidence Score</span>
                                <span>{Math.round(c.ai_confidence * 100)}%</span>
                              </div>
                              <div className="bg-blue-100 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${Math.round(c.ai_confidence * 100)}%` }} />
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Status History / Audit Trail (User Prompt Focus) */}
                      {historyList.length > 0 && (
                        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                            <History className="w-3.5 h-3.5 text-slate-500" />
                            <span>Official Action History</span>
                          </div>
                          <div className="space-y-2 text-xs">
                            {historyList.map((h) => (
                              <div key={h.id} className="bg-white p-2.5 rounded-xl border border-slate-100 space-y-1">
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="font-bold text-slate-800 capitalize bg-slate-100 px-2 py-0.5 rounded-md">
                                    {h.status}
                                  </span>
                                  <span className="text-slate-400">
                                    {h.timestamp ? new Date(h.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                                  </span>
                                </div>
                                <p className="text-slate-600 leading-snug">{h.notes}</p>
                                {h.changed_by_name && (
                                  <p className="text-[10px] text-slate-400">
                                    Updated by: <span className="font-semibold text-slate-600">{h.changed_by_name}</span> ({h.changed_by_role})
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* GIS routing */}
                      {c.department_name && (
                        <div className="bg-slate-50 rounded-2xl p-3 text-xs space-y-1">
                          <p className="font-bold text-slate-700 mb-1">Routed Municipal Team</p>
                          <p className="text-slate-600">Municipality: <b>{c.municipality}</b></p>
                          <p className="text-slate-600">Department: <b>{c.department_name}</b></p>
                          {c.assigned_officer && <p className="text-slate-600">Officer in Charge: <b>{c.assigned_officer}</b></p>}
                        </div>
                      )}

                      {/* Feedback for resolved */}
                      {c.status === 'resolved' && feedback[c.id] === undefined && role === 'citizen' && (
                        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 space-y-2.5">
                          <p className="text-xs font-bold text-green-900">Was this civic issue resolved to your satisfaction?</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => sendFeedback(c.id, 1)}
                              className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-green-700 transition-colors shadow-sm"
                            >
                              <ThumbsUp className="w-3.5 h-3.5" /> Yes, Fully Fixed
                            </button>
                            <button
                              onClick={() => sendFeedback(c.id, 0)}
                              className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-red-700 transition-colors shadow-sm"
                            >
                              <ThumbsDown className="w-3.5 h-3.5" /> Not Fixed (Reopen)
                            </button>
                          </div>
                        </div>
                      )}
                      {feedback[c.id] === 1 && <p className="text-xs text-green-600 font-bold text-center bg-green-50 p-2 rounded-xl">✅ Thank you! Citizen verification recorded.</p>}
                      {feedback[c.id] === 0 && <p className="text-xs text-red-600 font-bold text-center bg-red-50 p-2 rounded-xl">🔄 Complaint reopened for supervisor review.</p>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

