import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Leaf, TrendingUp, Users, Clock, Target, BarChart2, MapPin, Droplets } from 'lucide-react'

const MONTHLY_DATA = [
  { month:'Apr', rate:72 }, { month:'May', rate:78 }, { month:'Jun', rate:74 },
  { month:'Jul', rate:82 }, { month:'Aug', rate:85 }, { month:'Sep', rate:89 },
]

const ENV_METRICS = [
  { label:'Water Saved',     value:'184,200 L', pct:88, color:'from-blue-400   to-cyan-500',   icon:'💧' },
  { label:'Garbage Removed', value:'12.8 Tons', pct:62, color:'from-orange-400 to-amber-500',  icon:'🗑️' },
  { label:'Drains Cleared',  value:'847',       pct:76, color:'from-teal-400   to-green-500',  icon:'🌊' },
  { label:'Roads Cleaned',   value:'23 km',     pct:71, color:'from-purple-400 to-indigo-500', icon:'🛣️' },
]

const WARD_DATA = [
  { ward:'Ward 1', sanitation:'HIGH',     water:'LOW',      status:'Hotspot',  dot:'🔴', color:'bg-red-50 border-red-300',       badge:'bg-red-100 text-red-800',       issues:14 },
  { ward:'Ward 2', sanitation:'MODERATE', water:'HIGH',     status:'Elevated', dot:'🟠', color:'bg-orange-50 border-orange-300', badge:'bg-orange-100 text-orange-800', issues:11 },
  { ward:'Ward 3', sanitation:'LOW',      water:'MODERATE', status:'Moderate', dot:'🟡', color:'bg-yellow-50 border-yellow-300', badge:'bg-yellow-100 text-yellow-800', issues:8  },
  { ward:'Ward 4', sanitation:'LOW',      water:'LOW',      status:'Clean',    dot:'🟢', color:'bg-green-50 border-green-300',   badge:'bg-green-100 text-green-800',   issues:3  },
]

const BAR_COLORS = [
  'from-blue-400 to-indigo-600','from-orange-400 to-red-500','from-green-400 to-emerald-600',
  'from-purple-400 to-violet-600','from-yellow-400 to-amber-600','from-teal-400 to-cyan-600',
]

const CAT_EMOJI = {
  water_leakage:'💧', garbage_accumulation:'🗑️', broken_water_pipe:'🚰',
  drainage_blockage:'🕳️', waterlogging:'🌊', illegal_dumping:'♻️', other:'💡',
}

function HeroStat({ icon: Icon, value, label, sub, color }) {
  return (
    <div className="card flex flex-col items-center text-center gap-2 py-5">
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <p className="text-3xl font-black text-slate-900">{value}</p>
      <p className="text-sm font-bold text-slate-700">{label}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  )
}

export default function Analytics() {
  const [stats, setStats]       = useState(null)
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await axios.get('/api/dashboard/stats')
        setStats(data)
      } catch { toast.error('Could not load analytics') }
    }
    fetch()
    const t = setTimeout(() => setAnimated(true), 400)
    return () => clearTimeout(t)
  }, [])

  const resolved       = stats?.resolved || 0
  const total          = stats?.total    || 0
  const completionRate = total ? Math.round((resolved / total) * 100) : 0
  const catEntries     = Object.entries(stats?.categories || {})
  const maxCount       = Math.max(...catEntries.map(([,v]) => v), 1)
  const monthlyTarget  = 500
  const targetPct      = Math.min(100, Math.round((total / monthlyTarget) * 100))

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-700 to-cyan-800 text-white px-6 py-6 shadow-xl">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black flex items-center gap-2">
              <Leaf className="w-5 h-5 text-emerald-300" /> Environmental Impact Analytics
            </h1>
            <p className="text-sm text-emerald-200 mt-0.5">Kakinada Municipal Corporation</p>
          </div>
          <span className="self-start sm:self-auto bg-emerald-600/60 border border-emerald-400 text-emerald-100 text-xs font-semibold px-4 py-2 rounded-full">
            📅 Last 30 Days
          </span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">

        {/* Hero stats */}
        <section>
          <p className="section-title">Impact at a Glance</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <HeroStat icon={Droplets} value={resolved}                     label="Issues Resolved"    sub="Environmental complaints fixed"  color="bg-blue-500"    />
            <HeroStat icon={Users}    value={`~${(resolved*3).toLocaleString()}`} label="Citizens Protected" sub="Estimated beneficiaries"  color="bg-purple-500"  />
            <HeroStat icon={Clock}    value="4.2h"                         label="Avg Response Time"  sub="From report to action"           color="bg-orange-500"  />
            <HeroStat icon={Target}   value={`${completionRate}%`}         label="Completion Rate"    sub="Resolved vs total filed"         color="bg-emerald-500" />
          </div>
        </section>

        {/* Environmental impact bars */}
        <section>
          <p className="section-title">Environmental Impact Metrics</p>
          <div className="card space-y-5">
            {ENV_METRICS.map(({ label, value, pct, color, icon }) => (
              <div key={label}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-slate-700">{icon} {label}</span>
                  <span className="text-sm font-black text-slate-900">{value}</span>
                </div>
                <div className="bg-slate-100 rounded-full h-4 overflow-hidden">
                  <div
                    className={`h-4 rounded-full bg-gradient-to-r ${color} transition-all duration-1000 ease-out`}
                    style={{ width: animated ? `${pct}%` : '0%' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category trends */}
          <section>
            <p className="section-title">Category Trend Analysis</p>
            <div className="card space-y-4">
              {catEntries.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No data available</p>}
              {catEntries.map(([cat, count], i) => {
                const pct    = Math.round((count / maxCount) * 100)
                const totPct = total ? Math.round((count / total) * 100) : 0
                return (
                  <div key={cat}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-medium text-slate-700">{CAT_EMOJI[cat] || '📍'} {cat.replace('_',' ')}</span>
                      <span className="text-xs text-slate-400">{count} · {totPct}%</span>
                    </div>
                    <div className="bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-3 rounded-full bg-gradient-to-r ${BAR_COLORS[i % BAR_COLORS.length]} transition-all duration-1000`}
                        style={{ width: animated ? `${pct}%` : '0%' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Monthly resolution rate */}
          <section>
            <p className="section-title">Monthly Resolution Rate</p>
            <div className="card">
              <div className="flex items-end justify-between gap-2 h-48">
                {MONTHLY_DATA.map(({ month, rate }, i) => {
                  const isLatest = i === MONTHLY_DATA.length - 1
                  return (
                    <div key={month} className="flex flex-col items-center gap-1 flex-1">
                      <span className="text-xs font-bold text-slate-700">{rate}%</span>
                      <div
                        className={`w-full rounded-t-lg transition-all duration-1000 ${isLatest ? 'bg-gradient-to-t from-emerald-600 to-emerald-400' : 'bg-gradient-to-t from-indigo-500 to-blue-400'}`}
                        style={{ height: animated ? `${rate}%` : '0%' }}
                      />
                      <span className="text-xs text-slate-500 font-medium">{month}</span>
                    </div>
                  )
                })}
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-emerald-700 font-semibold bg-emerald-50 rounded-lg px-3 py-2">
                <TrendingUp className="w-3.5 h-3.5" /> +17% improvement over 6 months
              </div>
            </div>
          </section>
        </div>

        {/* Ward heatmap */}
        <section>
          <p className="section-title">Civic Issue Heatmap — Ward Level</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {WARD_DATA.map(({ ward, sanitation, water, status, dot, color, badge, issues }) => (
              <div key={ward} className={`${color} border-2 rounded-2xl p-4 space-y-3`}>
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-slate-800">{ward}</h3>
                  <span className="text-xl">{dot}</span>
                </div>
                <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full ${badge}`}>{status}</span>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">🗑️ Sanitation</span>
                    <span className="font-semibold text-slate-800">{sanitation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">💧 Water</span>
                    <span className="font-semibold text-slate-800">{water}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200">
                    <span className="text-slate-400 text-xs">Open Issues</span>
                    <span className="font-black text-slate-900">{issues}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Citizen participation */}
        <section>
          <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <h2 className="text-xl font-black flex items-center gap-2">
                  <Users className="w-5 h-5" /> Citizen Participation
                </h2>
                <p className="text-indigo-200 text-sm mt-0.5">Community engagement driving civic improvement</p>
              </div>
              <div className="flex gap-6 flex-wrap">
                <div className="text-center">
                  <p className="text-3xl font-black">{total.toLocaleString()}</p>
                  <p className="text-xs text-indigo-200">Total Reports</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-black">{(total * 2).toLocaleString()}</p>
                  <p className="text-xs text-indigo-200">Est. Citizens</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-black">+18%</p>
                  <p className="text-xs text-indigo-200">vs Last Month</p>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-indigo-200">Monthly Target Progress</span>
                <span className="font-bold">{total} / {monthlyTarget} ({targetPct}%)</span>
              </div>
              <div className="bg-indigo-800/60 rounded-full h-4 overflow-hidden">
                <div
                  className="h-4 rounded-full bg-gradient-to-r from-yellow-400 to-green-400 transition-all duration-1000"
                  style={{ width: animated ? `${targetPct}%` : '0%' }}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
