import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  Users, UserCheck, Clock, CheckCircle2, XCircle, Search,
  Filter, Shield, Phone, Mail, MapPin, Award, Check, Copy,
  Calendar, AlertCircle, Sparkles, ArrowRight, FileText
} from 'lucide-react'

export default function VolunteerApplicationsTab({ onRefreshSummary }) {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all') // 'all' | 'pending' | 'approved' | 'rejected'
  const [searchQuery, setSearchQuery] = useState('')
  const [processingId, setProcessingId] = useState(null)
  const [rejectModalApp, setRejectModalApp] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [copiedId, setCopiedId] = useState(null)

  const getAuthHeaders = () => {
    const user = JSON.parse(localStorage.getItem('civicfix_user') || '{}')
    return user?.access_token ? { Authorization: `Bearer ${user.access_token}` } : {}
  }

  const fetchApplications = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await axios.get('/api/volunteers/admin/list', {
        headers: getAuthHeaders(),
      })
      setApplications(data)
      if (onRefreshSummary) onRefreshSummary(data)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to load volunteer applications.')
    } finally {
      setLoading(false)
    }
  }, [onRefreshSummary])

  useEffect(() => {
    fetchApplications()
  }, [fetchApplications])

  const handleApprove = async (app) => {
    setProcessingId(app.application_id)
    try {
      const { data } = await axios.patch(
        `/api/volunteers/admin/${app.application_id}/approve`,
        {
          admin_notes: `Approved for ${app.department} Team. Ward allocation: Ward ${app.ward || '3'}.`,
          ward_number: app.ward || '3',
        },
        { headers: getAuthHeaders() }
      )
      toast.success(`Approved! Worker ID generated: ${data.worker_id}`)
      fetchApplications()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Approval failed.')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (e) => {
    e.preventDefault()
    if (!rejectModalApp) return

    setProcessingId(rejectModalApp.application_id)
    try {
      await axios.patch(
        `/api/volunteers/admin/${rejectModalApp.application_id}/reject`,
        {
          admin_notes: rejectReason.trim() || 'Application did not meet current ward capacity requirements.',
        },
        { headers: getAuthHeaders() }
      )
      toast.success(`Application ${rejectModalApp.application_id} rejected.`)
      setRejectModalApp(null)
      setRejectReason('')
      fetchApplications()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Rejection failed.')
    } finally {
      setProcessingId(null)
    }
  }

  const copyWorkerId = (id) => {
    navigator.clipboard.writeText(id)
    setCopiedId(id)
    toast.success('Worker ID copied!')
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Filter & search logic
  const filtered = applications.filter(app => {
    const matchStatus = filterStatus === 'all' || app.status === filterStatus
    const q = searchQuery.toLowerCase()
    const matchSearch =
      !q ||
      app.name?.toLowerCase().includes(q) ||
      app.application_id?.toLowerCase().includes(q) ||
      app.phone?.includes(q) ||
      app.department?.toLowerCase().includes(q) ||
      app.ward?.includes(q)
    return matchStatus && matchSearch
  })

  const pendingCount = applications.filter(a => a.status === 'pending').length
  const approvedCount = applications.filter(a => a.status === 'approved').length
  const rejectedCount = applications.filter(a => a.status === 'rejected').length

  return (
    <div className="space-y-6">
      
      {/* Top Stat Overview Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Applications</p>
          <p className="text-2xl font-black text-slate-800 mt-1">{applications.length}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Pending Review</p>
          <p className="text-2xl font-black text-amber-900 mt-1">{pendingCount}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Approved Workers</p>
          <p className="text-2xl font-black text-emerald-900 mt-1">{approvedCount}</p>
        </div>
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
          <p className="text-xs font-bold text-rose-700 uppercase tracking-wider">Rejected</p>
          <p className="text-2xl font-black text-rose-900 mt-1">{rejectedCount}</p>
        </div>
      </div>

      {/* Control Bar: Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
        <div className="flex rounded-xl bg-slate-200/70 p-1 gap-1 text-xs font-bold">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterStatus === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({applications.length})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
              filterStatus === 'pending' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilterStatus('approved')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterStatus === 'approved' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Approved ({approvedCount})
          </button>
          <button
            onClick={() => setFilterStatus('rejected')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterStatus === 'rejected' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Rejected ({rejectedCount})
          </button>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, ID, phone, ward..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-9 py-1.5 text-xs bg-white"
          />
        </div>
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-500">Loading volunteer applications…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <UserCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-700 font-bold">No volunteer applications found</p>
          <p className="text-xs text-slate-400 mt-1">Try changing your filter or search criteria.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(app => (
            <div
              key={app.application_id}
              className={`bg-white rounded-2xl border transition-all p-5 shadow-sm space-y-4 ${
                app.status === 'pending'
                  ? 'border-amber-200 hover:border-amber-300 ring-1 ring-amber-100'
                  : app.status === 'approved'
                  ? 'border-emerald-200 hover:border-emerald-300'
                  : 'border-slate-200 opacity-80'
              }`}
            >
              {/* Card Header: Application ID, Name, Ward, Department & Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-xl">
                    {app.application_id}
                  </span>
                  <div>
                    <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                      {app.name}
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        Ward {app.ward || '3'}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>{app.phone}</span>
                      {app.email && <span>· {app.email}</span>}
                      <span>· Applied {new Date(app.created_at).toLocaleDateString('en-IN')}</span>
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <div>
                  {app.status === 'pending' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      <Clock className="w-3.5 h-3.5" /> PENDING REVIEW
                    </span>
                  )}
                  {app.status === 'approved' && (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5" /> APPROVED
                      </span>
                      {app.worker_id_generated && (
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-xs bg-emerald-700 text-white px-2.5 py-1 rounded-xl shadow-sm">
                          {app.worker_id_generated}
                          <button
                            onClick={() => copyWorkerId(app.worker_id_generated)}
                            className="hover:opacity-75 p-0.5"
                            title="Copy Worker ID"
                          >
                            {copiedId === app.worker_id_generated ? <Check className="w-3 h-3 text-emerald-200" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </span>
                      )}
                    </div>
                  )}
                  {app.status === 'rejected' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                      <XCircle className="w-3.5 h-3.5" /> REJECTED
                    </span>
                  )}
                </div>
              </div>

              {/* Grid: Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-700">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="font-bold text-slate-400 block mb-1">DEPARTMENT & TIME</span>
                  <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-indigo-600" /> {app.department}
                  </p>
                  <p className="text-slate-500 mt-1">Availability: <span className="font-medium text-slate-700">{app.availability || 'Flexible'}</span></p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 sm:col-span-2">
                  <span className="font-bold text-slate-400 block mb-1">SKILLS & EXPERIENCE</span>
                  <p className="font-medium text-slate-800">
                    {app.skills || 'General civic maintenance & field assistance'}
                  </p>
                  {app.address && (
                    <p className="text-slate-500 mt-1 flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" /> {app.address}
                    </p>
                  )}
                </div>
              </div>

              {/* Motivation quote */}
              {app.reason && (
                <div className="bg-indigo-50/50 rounded-xl p-3 border border-indigo-100/80 text-xs text-indigo-950">
                  <span className="font-bold text-indigo-900 block mb-0.5">Applicant Statement:</span>
                  <p className="italic text-indigo-800 leading-relaxed">"{app.reason}"</p>
                </div>
              )}

              {/* Admin Notes if present */}
              {app.admin_notes && (
                <div className="bg-slate-100 rounded-xl p-3 text-xs text-slate-700 border border-slate-200">
                  <span className="font-bold text-slate-600 block mb-0.5">Admin Record:</span>
                  <p>{app.admin_notes}</p>
                </div>
              )}

              {/* Action Buttons for Pending Applications */}
              {app.status === 'pending' && (
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setRejectModalApp(app)
                      setRejectReason('')
                    }}
                    disabled={processingId === app.application_id}
                    className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition"
                  >
                    Reject Application
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApprove(app)}
                    disabled={processingId === app.application_id}
                    className="w-full sm:w-auto px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl shadow-sm transition flex items-center justify-center gap-1.5"
                  >
                    {processingId === app.application_id ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Generating Worker ID...
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" /> Approve & Issue Worker ID
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                Reject Application: {rejectModalApp.application_id}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Rejecting volunteer application for <strong>{rejectModalApp.name}</strong> ({rejectModalApp.department}).
              </p>
            </div>

            <form onSubmit={handleReject} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Rejection / Notes</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Current capacity for Sanitation volunteers in Ward 12 is full."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="input-field text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalApp(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingId === rejectModalApp.application_id}
                  className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm"
                >
                  {processingId === rejectModalApp.application_id ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
