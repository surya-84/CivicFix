import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'
import axios from 'axios'
import { MapPin, RefreshCw, Filter } from 'lucide-react'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl, shadowUrl: iconShadow })

const STATUS_COLOR = {
  pending:     '#ef4444',
  assigned:    '#f59e0b',
  in_progress: '#3b82f6',
  resolved:    '#22c55e',
}

const SEV_RADIUS = { CRITICAL:16, HIGH:12, MODERATE:9, LOW:7 }

const CAT_EMOJI = {
  water_leakage:'💧', garbage_accumulation:'🗑️', broken_water_pipe:'🚰',
  drainage_blockage:'🕳️', waterlogging:'🌊', illegal_dumping:'♻️', other:'💡',
}

const CATS = ['All', 'water_leakage', 'garbage_accumulation', 'drainage_blockage', 'waterlogging', 'illegal_dumping', 'broken_water_pipe']
const NEARBY_DIST = ['240m', '450m', '520m', '820m', '890m', '1.2km', '1.5km']

function FlyTo({ coords }) {
  const map = useMap()
  useEffect(() => {
    if (coords) map.flyTo(coords, 16, { duration:1 })
  }, [coords])
  return null
}

export default function NearbyMap() {
  const navigate = useNavigate()
  const [mapData,    setMapData]    = useState(null)
  const [selected,   setSelected]   = useState(null)
  const [flyTo,      setFlyTo]      = useState(null)
  const [catFilter,  setCatFilter]  = useState('All')
  const [loading,    setLoading]    = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get('/api/dashboard/map')
      setMapData(data)
    } catch {/* silent */}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const features = (mapData?.features || []).filter(f =>
    catFilter === 'All' || f.properties.category === catFilter
  )

  const critical   = features.filter(f => f.properties.severity === 'CRITICAL').length
  const unresolved = features.filter(f => f.properties.status !== 'resolved').length

  const handleIssueClick = (f) => {
    const [lng, lat] = f.geometry.coordinates
    setSelected(f.properties.id)
    setFlyTo([lat, lng])
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-10 flex flex-col">
      <div className="max-w-4xl mx-auto w-full px-4 pt-4 space-y-3 flex-1 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-800">Nearby Civic Issues</h2>
            <p className="text-xs text-slate-500">{features.length} issues on map</p>
          </div>
          <button onClick={load} className="btn-ghost text-sm">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3">
          {[
            { color:'#ef4444', label:'Critical',    dot:'🔴' },
            { color:'#f59e0b', label:'Assigned',    dot:'🟡' },
            { color:'#3b82f6', label:'In Progress', dot:'🔵' },
            { color:'#22c55e', label:'Resolved',    dot:'🟢' },
          ].map(({ color, label, dot }) => (
            <div key={label} className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
              <span>{dot}</span> {label}
            </div>
          ))}
        </div>

        {/* Stats bar */}
        <div className="flex gap-3 flex-wrap">
          <div className="card py-2 px-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-bold text-slate-800">{features.length}</span>
            <span className="text-xs text-slate-500">total</span>
          </div>
          <div className="card py-2 px-4 flex items-center gap-2">
            <span className="text-sm font-bold text-orange-600">{unresolved}</span>
            <span className="text-xs text-slate-500">unresolved</span>
          </div>
          <div className="card py-2 px-4 flex items-center gap-2">
            <span className="text-sm font-bold text-red-600">{critical}</span>
            <span className="text-xs text-slate-500">critical</span>
          </div>
        </div>

        {/* Category filter */}
        <div className="overflow-x-auto -mx-4 px-4">
          <div className="flex gap-2 pb-1 whitespace-nowrap">
            <Filter className="w-4 h-4 text-slate-400 mt-1.5 shrink-0" />
            {CATS.map(cat => (
              <button key={cat} onClick={() => setCatFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  catFilter === cat ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'
                }`}>
                {cat === 'All' ? 'All Issues' : `${CAT_EMOJI[cat] || '📍'} ${cat.replace('_',' ')}`}
              </button>
            ))}
          </div>
        </div>

        {/* Map */}
        <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm flex-1" style={{ minHeight: '300px' }}>
          <MapContainer center={[16.9891, 82.2475]} zoom={13} style={{ height:'100%', minHeight:'300px', width:'100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
            {flyTo && <FlyTo coords={flyTo} />}
            {features.map((f, i) => {
              const { status, severity, ai_label, category, priority_score, report_count, ward_number, id } = f.properties
              const [lng, lat] = f.geometry.coordinates
              const color  = STATUS_COLOR[status] || '#6b7280'
              const radius = SEV_RADIUS[severity] || 8
              const isSelected = selected === id
              return (
                <CircleMarker
                  key={i}
                  center={[lat, lng]}
                  radius={isSelected ? radius + 4 : radius}
                  pathOptions={{
                    color: isSelected ? '#fff' : 'rgba(255,255,255,0.6)',
                    fillColor: color,
                    fillOpacity: 0.85,
                    weight: isSelected ? 3 : 1.5,
                  }}
                  eventHandlers={{ click: () => setSelected(id) }}
                >
                  <Popup>
                    <div className="text-sm space-y-1 min-w-[160px]">
                      <p className="font-bold text-slate-800">{CAT_EMOJI[category] || '📍'} {ai_label || category}</p>
                      <p className="text-xs text-slate-500 font-mono">{id}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                          status === 'resolved' ? 'bg-green-100 text-green-700' :
                          status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                          status === 'assigned' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>{status?.replace('_',' ')}</span>
                      </div>
                      <p className="text-xs">Priority: <b>{priority_score}/100</b></p>
                      {report_count > 1 && <p className="text-xs">{report_count} citizens reported</p>}
                      {ward_number && <p className="text-xs">Ward {ward_number}</p>}
                      <button
                        onClick={() => navigate('/track')}
                        className="text-xs text-blue-600 font-semibold hover:underline"
                      >View Details →</button>
                    </div>
                  </Popup>
                </CircleMarker>
              )
            })}
          </MapContainer>
        </div>

        {/* Horizontal scroll issue list */}
        {features.length > 0 && (
          <div>
            <p className="section-title">Issue List</p>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
              {features.slice(0, 12).map((f, i) => {
                const { status, severity, ai_label, category, id, priority_score } = f.properties
                const isSelected = selected === id
                return (
                  <button
                    key={id}
                    onClick={() => handleIssueClick(f)}
                    className={`flex-shrink-0 w-36 text-left rounded-2xl border p-3 space-y-1.5 transition-all active:scale-95 ${
                      isSelected ? 'border-blue-400 bg-blue-50 shadow-md' : 'bg-white border-slate-100 shadow-sm hover:shadow-md'
                    }`}
                  >
                    <span className="text-2xl">{CAT_EMOJI[category] || '📍'}</span>
                    <p className="text-xs font-bold text-slate-800 leading-tight line-clamp-2">{ai_label || category?.replace('_',' ')}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">{NEARBY_DIST[i % 7]}</span>
                      <span className={`text-[10px] font-bold ${
                        severity === 'CRITICAL' ? 'text-red-600' :
                        severity === 'HIGH' ? 'text-orange-600' :
                        severity === 'MODERATE' ? 'text-yellow-600' : 'text-green-600'
                      }`}>{severity}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {features.length === 0 && !loading && (
          <div className="card text-center py-8 text-slate-400">
            <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="font-semibold text-sm">No issues found for this filter</p>
          </div>
        )}
      </div>
    </div>
  )
}
