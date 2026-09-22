import React, { useEffect, useState, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, Circle } from 'react-leaflet'
import L from 'leaflet'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconShadowUrl from 'leaflet/dist/images/marker-shadow.png'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  AlertTriangle, Activity, CheckCircle, Clock, Brain,
  ChevronDown, ChevronUp, Filter, RefreshCw, MapPin, Zap,
  TrendingUp, BarChart2, List, UserCheck, Shield
} from 'lucide-react'
import AIChat from '../components/AIChat'
import VolunteerApplicationsTab from '../components/VolunteerApplicationsTab'
import AdminManagementTab from '../components/AdminManagementTab'
import ChangePasswordModal from '../components/ChangePasswordModal'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl, shadowUrl: iconShadowUrl })

const KAKINADA_HOT_ZONES = [
  { lat: 16.9891, lng: 82.2475 }, { lat: 16.9750, lng: 82.2350 },
  { lat: 17.0020, lng: 82.2600 }, { lat: 16.9650, lng: 82.2550 },
  { lat: 16.9930, lng: 82.2200 },
]


const STATUS_COLORS = {
  pending:     '#EF4444',
  assigned:    '#F59E0B',
  in_progress: '#3B82F6',
  resolved:    '#10B981',
}

const SEV_BADGE = {
  CRITICAL: 'bg-red-100 text-red-800 border-red-300',
  HIGH:     'bg-orange-100 text-orange-800 border-orange-300',
  MODERATE: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  LOW:      'bg-green-100 text-green-800 border-green-300',
}

const CAT_EMOJI = {
  water_leakage:'💧', garbage_accumulation:'🗑️', broken_water_pipe:'🚰',
  drainage_blockage:'🕳️', waterlogging:'🌊', illegal_dumping:'♻️', other:'💡',
}

function LiveClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <span className="text-sm font-mono text-slate-300">
      {time.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
      {' · '}
      {time.toLocaleDateString('en-IN', { weekday:'short', day:'2-digit', month:'short' })}
    </span>
  )
}

function KPICard({ label, value, icon: Icon, grad, change, sub }) {
  return (
    <div className={`${grad} rounded-2xl p-5 text-white shadow-lg`}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest opacity-75">{sub}</p>
          <p className="text-4xl font-black mt-1">{value ?? '—'}</p>
          <p className="text-sm font-semibold mt-1">{label}</p>
        </div>
        <div className="bg-white/20 rounded-xl p-3"><Icon className="w-6 h-6" /></div>
      </div>
      <div className="flex items-center gap-1 text-xs opacity-90">
        <TrendingUp className="w-3 h-3" /> {change}
      </div>
    </div>
  )
}

function ResolutionGauge({ pct }) {
  const p = Math.min(100, Math.max(0, pct || 0))
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="w-36 h-36 rounded-full flex items-center justify-center shadow-inner"
        style={{ background: `conic-gradient(#10B981 ${p * 3.6}deg, #e5e7eb ${p * 3.6}deg)` }}
      >
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center">
          <span className="text-2xl font-black text-slate-800">{p}%</span>
        </div>
      </div>
      <p className="text-sm font-semibold text-slate-600">Resolution Rate</p>
    </div>
  )
}

function LiveMapTab({ mapData }) {
  const center = [16.9891, 82.2475]
  if (!mapData) return <div className="py-20 text-center text-slate-400">Loading map data…</div>
  return (
    <div className="space-y-4">
      <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-200">
        <MapContainer center={center} zoom={13} style={{ height:'500px', width:'100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
          {KAKINADA_HOT_ZONES.map((z, i) => (
            <Circle key={i} center={[z.lat, z.lng]} radius={400}
              pathOptions={{ color:'#EF4444', fillColor:'#EF4444', fillOpacity:0.12, weight:1 }} />
          ))}
          {(mapData.features || []).map((f, i) => {
            const { status, severity, category, id, ward_number, priority_score } = f.properties
            const [lng, lat] = f.geometry.coordinates
            const color  = STATUS_COLORS[status] || '#6b7280'
            const radius = severity === 'CRITICAL' ? 13 : severity === 'HIGH' ? 10 : 7
            return (
              <CircleMarker key={i} center={[lat, lng]} radius={radius}
                pathOptions={{ color:'white', fillColor:color, fillOpacity:0.85, weight:2 }}>
                <Popup>
                  <div className="text-sm space-y-1 min-w-[160px]">
                    <p className="font-bold">{CAT_EMOJI[category] || '📍'} {f.properties.ai_label || category}</p>
                    <p className="text-xs text-slate-500 font-mono">{id}</p>
                    <p>Status: <b className="capitalize">{status?.replace('_',' ')}</b></p>
                    <p>Severity: <b>{severity}</b></p>
                    <p>Priority: <b>{priority_score}/100</b></p>
                    {ward_number && <p>Ward: <b>{ward_number}</b></p>}
                  </div>
                </Popup>
              </CircleMarker>
            )
          })}
        </MapContainer>
      </div>
      <div className="flex flex-wrap gap-4">
        {Object.entries({ Pending:'#EF4444', Assigned:'#F59E0B', 'In Progress':'#3B82F6', Resolved:'#10B981' }).map(([label, color]) => (
          <div key={label} className="flex items-center gap-1.5 text-sm">
            <div className="w-3 h-3 rounded-full" style={{ background: color }} />
            <span className="text-slate-600">{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-sm">
          <div className="w-3 h-3 rounded-full bg-red-300 opacity-50 border border-red-400" />
          <span className="text-slate-600">Hot Zone</span>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {['pending','assigned','in_progress','resolved'].map(s => {
          const count = (mapData.features || []).filter(f => f.properties.status === s).length
          return (
            <div key={s} className="bg-white rounded-xl border border-slate-200 p-3 text-center shadow-sm">
              <p className="text-xl font-black" style={{ color: STATUS_COLORS[s] }}>{count}</p>
              <p className="text-xs text-slate-500 capitalize">{s.replace('_',' ')}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PriorityQueueTab({ queue, onRefresh }) {
  const [expanded, setExpanded] = useState(null)
  const [assigning, setAssigning] = useState(null)
  const [sevFilter, setSevFilter] = useState('ALL')
  const [workers, setWorkers] = useState([])
  const [loadingWorkers, setLoadingWorkers] = useState(false)

  const filtered = (queue || [])
    .filter(c => sevFilter === 'ALL' || c.severity === sevFilter)
    .sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0))

  const handleStatus = async (id, status) => {
    try {
      const token = localStorage.getItem('civicfix_token')
      const user = JSON.parse(localStorage.getItem('civicfix_user') || '{}')
      const headers = (token || user?.access_token) ? { Authorization: `Bearer ${token || user.access_token}` } : {}
      await axios.patch(`/api/complaints/${id}/status`, { status }, { headers })
      toast.success(`Status → ${status}`)
      onRefresh()
    } catch (err) {
      const msg = err.response?.data?.detail || 'Update failed'
      toast.error(msg)
    }
  }

  const handleAssignClick = async (complaintId) => {
    if (assigning === complaintId) {
      setAssigning(null)
      return
    }
    setAssigning(complaintId)
    setLoadingWorkers(true)
    try {
      const token = localStorage.getItem('civicfix_token')
      const user = JSON.parse(localStorage.getItem('civicfix_user') || '{}')
      const headers = (token || user?.access_token) ? { Authorization: `Bearer ${token || user.access_token}` } : {}
      const res = await axios.get(`/api/admin/workers?complaint_id=${complaintId}`, { headers })
      setWorkers(res.data || [])
    } catch (err) {
      console.error('Failed to load eligible workers:', err)
      toast.error('Failed to load eligible workers')
      setWorkers([])
    } finally {
      setLoadingWorkers(false)
    }
  }

  const handleAssign = async (id, worker) => {
    try {
      const token = localStorage.getItem('civicfix_token')
      const user = JSON.parse(localStorage.getItem('civicfix_user') || '{}')
      const headers = (token || user?.access_token) ? { Authorization: `Bearer ${token || user.access_token}` } : {}
      await axios.post(`/api/complaints/${id}/assign`, { worker_id: worker.id }, { headers })
      toast.success(`Assigned to ${worker.name} (${worker.worker_code})`)
      setAssigning(null)
      onRefresh()
    } catch (err) {
      const msg = err.response?.data?.detail || 'Assignment failed'
      toast.error(msg)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-slate-500" />
        <span className="text-sm text-slate-600 font-medium">Filter:</span>
        {['ALL','CRITICAL','HIGH','MODERATE','LOW'].map(s => (
          <button key={s} onClick={() => setSevFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
              sevFilter === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-400'
            }`}
          >{s}</button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && <div className="py-10 text-center text-slate-400">No complaints for this filter.</div>}
        {filtered.map((c, idx) => (
          <div key={c.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white text-sm font-black flex items-center justify-center shrink-0">{idx + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-bold text-slate-800 text-sm">{CAT_EMOJI[c.category] || '📍'} {c.ai_label || c.category}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${SEV_BADGE[c.severity] || ''}`}>{c.severity}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 bg-slate-100 rounded-full h-2">
                      <div className="h-2 rounded-full bg-gradient-to-r from-orange-400 to-red-500"
                        style={{ width:`${c.priority_score || 0}%` }} />
                    </div>
                    <span className="text-xs font-bold text-slate-500 w-12 text-right">{Math.round(c.priority_score || 0)}/100</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select defaultValue={c.status} onChange={e => handleStatus(c.id, e.target.value)}
                      className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
                      <option value="pending">Pending</option>
                      <option value="assigned">Assigned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                    {c.worker_name && (
                      <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-1 rounded-lg border border-emerald-200">
                        👷 {c.worker_name} ({c.worker_code})
                      </span>
                    )}
                    <div className="relative">
                      <button onClick={() => handleAssignClick(c.id)}
                        className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold px-3 py-1 rounded-lg border border-indigo-200">
                        {c.worker_name ? 'Reassign Worker' : 'Assign Worker'}
                      </button>
                      {assigning === c.id && (
                        <div className="absolute left-0 top-8 z-20 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden min-w-[200px] max-h-60 overflow-y-auto">
                          {loadingWorkers ? (
                            <div className="px-4 py-3 text-xs text-slate-400 italic">
                              Loading eligible workers...
                            </div>
                          ) : workers.length === 0 ? (
                            <div className="px-4 py-3 text-xs text-slate-400 italic">
                              No eligible workers available
                            </div>
                          ) : (
                            workers.map(w => (
                              <button key={w.id} onClick={() => handleAssign(c.id, w)}
                                className="block w-full text-left px-4 py-2.5 text-xs hover:bg-indigo-50 text-slate-700 border-b border-slate-50 last:border-0 transition-colors">
                                <div className="font-bold text-slate-800 flex items-center justify-between gap-2">
                                  <span>{w.name}</span>
                                  <span className="font-mono text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">{w.worker_code}</span>
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  {w.department_name || 'General Municipal'} {w.ward_number ? `· Ward ${w.ward_number}` : ''}
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    <button onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                      className="ml-auto text-xs text-slate-400 hover:text-indigo-600 flex items-center gap-1">
                      {expanded === c.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      {expanded === c.id ? 'Less' : 'Details'}
                    </button>
                  </div>
                </div>
              </div>

              {expanded === c.id && (
                <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-700">
                  <div><span className="font-semibold text-slate-400">Ward:</span> {c.ward_number || 'N/A'}</div>
                  <div><span className="font-semibold text-slate-400">Dept:</span> {c.department_name || 'N/A'}</div>
                  <div><span className="font-semibold text-slate-400">Officer:</span> {c.assigned_officer || 'Unassigned'}</div>
                  <div><span className="font-semibold text-slate-400">Assigned Worker:</span> {c.worker_name ? `${c.worker_name} (${c.worker_code})` : 'Unassigned'}</div>
                  <div><span className="font-semibold text-slate-400">Reports:</span> {c.report_count || 1}</div>
                  <div className="col-span-2"><span className="font-semibold text-slate-400">AI:</span> {c.ai_description || 'N/A'}</div>
                  <div><span className="font-semibold text-slate-400">Confidence:</span> {c.ai_confidence ? `${Math.round(c.ai_confidence*100)}%` : 'N/A'}</div>
                  <div><span className="font-semibold text-slate-400">Filed:</span> {c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN') : 'N/A'}</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function MunicipalDashboard() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('civicfix_user') || '{}')
    } catch {
      return {}
    }
  })
  const [stats,   setStats]   = useState(null)
  const [mapData, setMapData] = useState(null)
  const [queue,   setQueue]   = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  const [aiOpen, setAiOpen]   = useState(false)
  const [loading, setLoading] = useState(true)
  const [pendingVolunteers, setPendingVolunteers] = useState(0)

  const fetchVolunteersCount = useCallback(async () => {
    try {
      const user = JSON.parse(localStorage.getItem('civicfix_user') || '{}')
      const headers = user?.access_token ? { Authorization: `Bearer ${user.access_token}` } : {}
      const { data } = await axios.get('/api/volunteers/admin/list?status=pending', { headers })
      setPendingVolunteers(data.length)
    } catch {}
  }, [])

  const fetchAll = useCallback(async () => {
    try {
      const user = JSON.parse(localStorage.getItem('civicfix_user') || '{}')
      const token = localStorage.getItem('civicfix_token')
      const headers = (token || user?.access_token) ? { Authorization: `Bearer ${token || user.access_token}` } : {}
      const [s, q] = await Promise.all([
        axios.get('/api/dashboard/stats', { headers }),
        axios.get('/api/dashboard/priority-queue', { headers }),
      ])
      setStats(s.data)
      setQueue(q.data)
    } catch { toast.error('Failed to load dashboard') }
    finally { setLoading(false) }
  }, [])

  const fetchMap = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/dashboard/map')
      setMapData(data)
    } catch {}
  }, [])

  useEffect(() => {
    fetchAll()
    fetchVolunteersCount()
  }, [fetchAll, fetchVolunteersCount])

  useEffect(() => { if (activeTab === 'map') fetchMap() }, [activeTab, fetchMap])

  const resolvedPct = stats?.total ? Math.round(((stats.resolved || 0) / stats.total) * 100) : 0

  const TABS = [
    { id:'overview',   label:'Overview',               icon: BarChart2 },
    { id:'map',        label:'Live Map',               icon: MapPin    },
    { id:'queue',      label:'Priority Queue',         icon: List      },
    { id:'volunteers', label:'Volunteer Applications', icon: UserCheck, badge: pendingVolunteers },
    { id:'governance', label:'Admin Governance',       icon: Shield    },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Command center header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 text-white px-6 py-5 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              CivicFix Municipal Command Center
            </h1>
            <p className="text-sm text-indigo-300 mt-0.5">Kakinada Municipal Corporation — Real-time</p>
          </div>
          <div className="flex items-center gap-3">
            <LiveClock />
            <button onClick={fetchAll} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* KPI grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard sub="new"     label="PENDING"     value={loading ? '…' : stats?.pending     ?? 0} icon={AlertTriangle} grad="bg-gradient-to-br from-red-500    to-rose-700"    change="+12% this week" />
          <KPICard sub="active"  label="IN PROGRESS" value={loading ? '…' : stats?.in_progress ?? 0} icon={Activity}      grad="bg-gradient-to-br from-blue-500   to-indigo-700"  change="+8% this week"  />
          <KPICard sub="fixed"   label="RESOLVED"    value={loading ? '…' : stats?.resolved    ?? 0} icon={CheckCircle}   grad="bg-gradient-to-br from-emerald-500 to-green-700"  change="+23% this week" />
          <KPICard sub="delayed" label="OVERDUE"     value={loading ? '…' : stats?.overdue     ?? 0} icon={Clock}         grad="bg-gradient-to-br from-orange-500  to-amber-700"  change="-5% this week"  />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex border-b border-slate-200 overflow-x-auto">
            {TABS.map(({ id, label, icon: Icon, badge }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
                  activeTab === id ? 'border-indigo-600 text-indigo-600 bg-indigo-50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}>
                <Icon className="w-4 h-4 shrink-0" />
                <span>{label}</span>
                {badge > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white animate-pulse">
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="p-5">
            {/* Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-indigo-600" /> Category Breakdown
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(stats?.categories || {}).map(([cat, count], i) => {
                        const pct = stats?.total ? Math.round((count / stats.total) * 100) : 0
                        return (
                          <div key={cat}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium text-slate-700">{CAT_EMOJI[cat] || '📍'} {cat.replace('_',' ')}</span>
                              <span className="text-slate-400">{count} ({pct}%)</span>
                            </div>
                            <div className="bg-slate-100 rounded-full h-3">
                              <div className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600" style={{ width:`${pct}%` }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-base font-bold text-slate-800 mb-3">Severity Distribution</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { k:'CRITICAL', bg:'bg-red-50    border-red-200',    t:'text-red-700'    },
                          { k:'HIGH',     bg:'bg-orange-50 border-orange-200', t:'text-orange-700' },
                          { k:'MODERATE', bg:'bg-yellow-50 border-yellow-200', t:'text-yellow-700' },
                          { k:'LOW',      bg:'bg-green-50  border-green-200',  t:'text-green-700'  },
                        ].map(({ k, bg, t }) => (
                          <div key={k} className={`${bg} border rounded-xl p-3 text-center`}>
                            <p className={`text-2xl font-black ${t}`}>{stats?.severities?.[k] ?? 0}</p>
                            <p className={`text-xs font-semibold ${t}`}>{k}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <ResolutionGauge pct={resolvedPct} />
                    </div>
                  </div>
                </div>

                {/* Recent activity */}
                <div>
                  <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-600" /> Recent Activity
                  </h3>
                  <div className="relative pl-6">
                    <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-slate-200" />
                    <div className="space-y-3">
                      {(queue.slice(0, 5)).map(c => (
                        <div key={c.id} className="relative">
                          <span className="absolute -left-4 top-1 w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center text-xs text-white">
                            {CAT_EMOJI[c.category] || '📍'}
                          </span>
                          <div className="bg-white border border-slate-100 rounded-xl px-4 py-3 shadow-sm">
                            <div className="flex justify-between items-start">
                              <p className="text-sm font-semibold text-slate-800">{c.ai_label || c.category}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${SEV_BADGE[c.severity] || ''}`}>{c.severity}</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {c.created_at ? new Date(c.created_at).toLocaleString('en-IN') : 'Just now'} · Ward {c.ward_number}
                            </p>
                          </div>
                        </div>
                      ))}
                      {queue.length === 0 && <p className="text-sm text-slate-400">No recent complaints.</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'map'        && <LiveMapTab mapData={mapData} />}
            {activeTab === 'queue'      && <PriorityQueueTab queue={queue} onRefresh={fetchAll} />}
            {activeTab === 'volunteers' && (
              <VolunteerApplicationsTab onRefreshSummary={(apps) => setPendingVolunteers(apps.filter(a => a.status === 'pending').length)} />
            )}
            {activeTab === 'governance' && (
              <AdminManagementTab currentUser={currentUser} />
            )}
          </div>
        </div>
      </div>

      {/* Mandatory Password Change Dialog for first-time login / temp password */}
      <ChangePasswordModal
        isOpen={currentUser?.must_change_password === true}
        onSuccess={(updatedUser) => {
          setCurrentUser(updatedUser)
        }}
        onLogout={() => {
          localStorage.removeItem('civicfix_token')
          localStorage.removeItem('civicfix_user')
          window.location.href = '/login'
        }}
      />

      {/* Floating AI button */}
      <button
        onClick={() => setAiOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 text-white shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
        title="Open AI Assistant"
      >
        <Brain className="w-6 h-6" />
      </button>

      <AIChat isOpen={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  )
}
