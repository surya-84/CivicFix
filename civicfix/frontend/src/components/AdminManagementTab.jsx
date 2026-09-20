import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  Shield, ShieldAlert, ShieldCheck, UserPlus, Key, Copy, Check,
  RefreshCw, Lock, Unlock, Eye, Users, FileText, Settings,
  AlertCircle, CheckCircle2, ChevronRight, Clock, Building, Phone, Mail
} from 'lucide-react'

const AVAILABLE_PERMISSIONS = [
  { id: 'VIEW_COMPLAINTS', label: 'View Complaints & Map', desc: 'Can inspect incoming citizen reports and ward map' },
  { id: 'MANAGE_COMPLAINTS', label: 'Manage Issue Status', desc: 'Can update progress status, severity, and resolution notes' },
  { id: 'ASSIGN_WORKERS', label: 'Dispatch Field Workers', desc: 'Can assign tasks to municipal field staff' },
  { id: 'MANAGE_VOLUNTEERS', label: 'Volunteer Applications', desc: 'Can review, approve, and reject citizen volunteers' },
  { id: 'VIEW_ANALYTICS', label: 'Environmental Analytics', desc: 'Can view ward heatmaps, response times, and KPI trends' },
]

export default function AdminManagementTab({ currentUser }) {
  const isSuperAdmin = currentUser?.admin_level === 'SUPER_ADMIN' || 
    (currentUser?.permissions && (currentUser.permissions.includes('ALL') || currentUser.permissions.includes('MANAGE_ADMINS')))

  const [admins, setAdmins] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [activeSubTab, setActiveSubTab] = useState('admins') // 'admins' | 'audit'
  const [loading, setLoading] = useState(false)
  const [auditLoading, setAuditLoading] = useState(false)

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    phone: '',
    email: '',
    department_id: '',
    permissions: ['VIEW_COMPLAINTS', 'MANAGE_COMPLAINTS', 'ASSIGN_WORKERS'],
  })
  const [submitting, setSubmitting] = useState(false)

  // Generated Credentials Modal
  const [generatedCreds, setGeneratedCreds] = useState(null)
  const [copied, setCopied] = useState(false)

  // Edit Permissions Modal
  const [editingAdmin, setEditingAdmin] = useState(null)
  const [editPermissions, setEditPermissions] = useState([])
  const [updatingPerms, setUpdatingPerms] = useState(false)

  const token = localStorage.getItem('civicfix_token')
  const authHeaders = { Authorization: `Bearer ${token}` }

  // 1. Fetch Administrators
  const fetchAdmins = useCallback(async () => {
    try {
      setLoading(true)
      const res = await axios.get('/api/admin/admins', { headers: authHeaders })
      setAdmins(res.data)
    } catch (err) {
      console.error('Failed to load administrators:', err)
      toast.error('Failed to fetch administrator roster')
    } finally {
      setLoading(false)
    }
  }, [token])

  // 2. Fetch Audit Logs
  const fetchAuditLogs = useCallback(async () => {
    try {
      setAuditLoading(true)
      const res = await axios.get('/api/admin/audit-logs', { headers: authHeaders })
      setAuditLogs(res.data)
    } catch (err) {
      console.error('Failed to load audit logs:', err)
    } finally {
      setAuditLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchAdmins()
    fetchAuditLogs()
  }, [fetchAdmins, fetchAuditLogs])

  // Toggle Admin Status
  const handleToggleStatus = async (admin) => {
    if (admin.id === currentUser?.user_id || admin.admin_code === currentUser?.admin_code) {
      toast.error('Safety constraint: You cannot disable your own administrator account.')
      return
    }
    const action = admin.is_active ? 'deactivate' : 'activate'
    if (!window.confirm(`Are you sure you want to ${action} ${admin.name} (${admin.admin_code})?`)) {
      return
    }

    try {
      const res = await axios.patch(`/api/admin/admins/${admin.admin_code}/status`, {}, { headers: authHeaders })
      toast.success(res.data.message || `Status updated for ${admin.admin_code}`)
      fetchAdmins()
      fetchAuditLogs()
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to change administrator status'
      toast.error(msg)
    }
  }

  // Create Co-Admin Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    if (!createForm.name.trim() || !createForm.phone.trim()) {
      toast.error('Name and 10-digit mobile number are required')
      return
    }
    if (createForm.phone.trim().length < 10) {
      toast.error('Mobile number must be at least 10 digits')
      return
    }

    try {
      setSubmitting(true)
      const payload = {
        name: createForm.name.trim(),
        phone: createForm.phone.trim(),
        email: createForm.email.trim() || null,
        department_id: createForm.department_id ? parseInt(createForm.department_id) : null,
        admin_level: 'CO_ADMIN',
        permissions: createForm.permissions,
      }

      const res = await axios.post('/api/admin/admins', payload, { headers: authHeaders })
      setShowCreateModal(false)
      setGeneratedCreds(res.data)
      setCreateForm({
        name: '',
        phone: '',
        email: '',
        department_id: '',
        permissions: ['VIEW_COMPLAINTS', 'MANAGE_COMPLAINTS', 'ASSIGN_WORKERS'],
      })
      toast.success('Co-Admin account created successfully!')
      fetchAdmins()
      fetchAuditLogs()
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to create Co-Admin account'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // Save Permissions
  const handleSavePermissions = async () => {
    if (!editingAdmin) return
    try {
      setUpdatingPerms(true)
      await axios.patch(`/api/admin/admins/${editingAdmin.admin_code}/permissions`, {
        permissions: editPermissions
      }, { headers: authHeaders })
      toast.success(`Updated permissions for ${editingAdmin.name}`)
      setEditingAdmin(null)
      fetchAdmins()
      fetchAuditLogs()
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to update permissions'
      toast.error(msg)
    } finally {
      setUpdatingPerms(false)
    }
  }

  const handleCopyCredentials = () => {
    if (!generatedCreds) return
    const text = `CivicFix Co-Admin Portal Credentials\nName: ${generatedCreds.name}\nAdmin ID: ${generatedCreds.admin_code}\nTemporary Password: ${generatedCreds.temporary_password}\nLogin URL: http://localhost:5173/login`
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Credentials copied to clipboard!')
    setTimeout(() => setCopied(false), 3000)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="px-2.5 py-1 rounded-lg bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-300" />
                Municipal Governance & Access Hierarchy
              </span>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                currentUser?.admin_level === 'SUPER_ADMIN' 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30' 
                  : 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
              }`}>
                Role: {currentUser?.admin_level || 'ADMIN'}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Administrator Access & Governance
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Enforce role-based segregation of municipal duties. Super Administrators allocate granular permissions, issue auto-generated Co-Admin accounts with temporary keys, and monitor full activity audit trails.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isSuperAdmin && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary py-3 px-5 text-sm font-bold shadow-lg shadow-blue-500/25 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Create Co-Admin</span>
              </button>
            )}
            <button
              onClick={() => { fetchAdmins(); fetchAuditLogs(); }}
              className="p-3 bg-white/10 hover:bg-white/20 active:bg-white/25 rounded-xl text-white transition-all"
              title="Refresh roster & audit logs"
            >
              <RefreshCw className={`w-4 h-4 ${loading || auditLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Sub Navigation Bar */}
        <div className="flex items-center gap-2 mt-6 pt-6 border-t border-slate-800">
          <button
            onClick={() => setActiveSubTab('admins')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'admins'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Administrator Roster ({admins.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('audit')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'audit'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Governance Audit Trail ({auditLogs.length})</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SUB-TAB 1: ADMINISTRATOR ROSTER */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'admins' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span>Active Municipal Administrators</span>
              <span className="text-xs font-normal text-slate-500">
                ({admins.filter(a => a.is_active).length} Active · {admins.filter(a => !a.is_active).length} Deactivated)
              </span>
            </h2>
            {!isSuperAdmin && (
              <span className="text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 flex items-center gap-1.5 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                Co-Admin View: Modifying administrator accounts requires Super Admin privileges.
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {admins.map((adm) => {
              const isCurrentUser = adm.id === currentUser?.user_id || adm.admin_code === currentUser?.admin_code
              const isSuper = adm.admin_level === 'SUPER_ADMIN'

              return (
                <div
                  key={adm.id}
                  className={`bg-white rounded-2xl border p-5 transition-all shadow-sm flex flex-col justify-between ${
                    !adm.is_active 
                      ? 'border-red-200 bg-red-50/30 opacity-75' 
                      : isSuper 
                      ? 'border-indigo-200 hover:border-indigo-400' 
                      : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div>
                    {/* Header: Code + Level + Status */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold px-2 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                          {adm.admin_code}
                        </span>
                        {isCurrentUser && (
                          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                            YOU
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isSuper 
                            ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}>
                          {adm.admin_level || 'ADMIN'}
                        </span>

                        <span className={`w-2 h-2 rounded-full ${adm.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      </div>
                    </div>

                    {/* Name & Dept */}
                    <div className="mb-3">
                      <h3 className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                        {adm.name}
                      </h3>
                      <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        <span>{adm.department_name || 'All Municipal Departments'}</span>
                      </div>
                    </div>

                    {/* Contact details */}
                    <div className="space-y-1 text-xs text-slate-600 mb-4 bg-slate-50/80 rounded-xl p-2.5 border border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium">{adm.phone}</span>
                      </div>
                      {adm.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{adm.email}</span>
                        </div>
                      )}
                      {adm.must_change_password && (
                        <div className="flex items-center gap-1.5 text-amber-700 font-semibold pt-1">
                          <Key className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Must change temp password on next login</span>
                        </div>
                      )}
                    </div>

                    {/* Granular Permissions Badges */}
                    <div className="mb-4">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                        Assigned Permissions ({adm.permissions?.length || 0})
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {isSuper ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                            FULL MUNICIPAL ACCESS (ALL)
                          </span>
                        ) : adm.permissions && adm.permissions.length > 0 ? (
                          adm.permissions.map((p) => (
                            <span
                              key={p}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200"
                            >
                              {p.replace(/_/g, ' ')}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No permissions assigned</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  {isSuperAdmin && !isSuper && (
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          setEditingAdmin(adm)
                          setEditPermissions(adm.permissions || [])
                        }}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Edit Permissions</span>
                      </button>

                      <button
                        onClick={() => handleToggleStatus(adm)}
                        disabled={isCurrentUser}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                          adm.is_active
                            ? 'text-red-600 hover:bg-red-50 border border-red-200'
                            : 'text-emerald-700 hover:bg-emerald-50 border border-emerald-300'
                        }`}
                      >
                        {adm.is_active ? (
                          <>
                            <Lock className="w-3 h-3" />
                            <span>Deactivate</span>
                          </>
                        ) : (
                          <>
                            <Unlock className="w-3 h-3" />
                            <span>Activate</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SUB-TAB 2: GOVERNANCE AUDIT TRAIL */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <span>Municipal Governance Audit Trail</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Immutable chronological log of all administrative creations, permission shifts, volunteer verifications, and account suspensions.
              </p>
            </div>
            <button
              onClick={fetchAuditLogs}
              className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5 self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${auditLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Log</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Administrator</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No administrative audit entries recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => {
                    const date = log.timestamp ? new Date(log.timestamp) : new Date()
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/75 transition-colors">
                        <td className="py-3 px-4 text-slate-500 font-mono whitespace-nowrap">
                          {date.toLocaleString('en-IN', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-bold text-slate-800">{log.admin_name}</span>
                          <span className="text-[10px] text-slate-400 font-mono ml-1.5">({log.admin_code})</span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                            log.action.includes('CREATE')
                              ? 'bg-blue-100 text-blue-800'
                              : log.action.includes('DISABLE')
                              ? 'bg-red-100 text-red-800'
                              : log.action.includes('ENABLE')
                              ? 'bg-emerald-100 text-emerald-800'
                              : log.action.includes('APPROVE')
                              ? 'bg-green-100 text-green-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-semibold text-[11px]">
                            {log.target_id || log.target_type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 max-w-md">
                          {log.details}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: CREATE CO-ADMIN */}
      {/* ------------------------------------------------------------- */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-slate-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-6 text-white">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-3">
                <UserPlus className="w-6 h-6 text-indigo-300" />
              </div>
              <h3 className="text-xl font-bold">Issue New Co-Admin Account</h3>
              <p className="text-xs text-indigo-200 mt-1">
                Generates a unique Admin ID (ADM-XXXXXX) and a secure temporary password with custom municipal permissions.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Full Legal Name *
                </label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g. Smt. Lakshmi Devi"
                  className="input-field text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Mobile Number (10-Digit) *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value.replace(/\D/g, '') })}
                    placeholder="9000000008"
                    className="input-field text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Official Email
                  </label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="officer@kmc.gov.in"
                    className="input-field text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Assigned Department
                </label>
                <select
                  value={createForm.department_id}
                  onChange={(e) => setCreateForm({ ...createForm, department_id: e.target.value })}
                  className="input-field text-sm"
                >
                  <option value="">All Departments (General Administration)</option>
                  <option value="1">Sanitation Dept – KMC (Ward 3)</option>
                  <option value="2">Water Works Dept – KMC (Ward 3)</option>
                  <option value="3">Drainage Dept – KMC (Ward 3)</option>
                </select>
              </div>

              {/* Permissions checkboxes */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Granular Access Permissions
                </label>
                <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  {AVAILABLE_PERMISSIONS.map((p) => {
                    const checked = createForm.permissions.includes(p.id)
                    return (
                      <label
                        key={p.id}
                        className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-white cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCreateForm({ ...createForm, permissions: [...createForm.permissions, p.id] })
                            } else {
                              setCreateForm({
                                ...createForm,
                                permissions: createForm.permissions.filter((x) => x !== p.id)
                              })
                            }
                          }}
                          className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-800">{p.label}</p>
                          <p className="text-[11px] text-slate-500">{p.desc}</p>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary text-xs py-2.5 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs py-2.5 px-5 shadow-lg shadow-blue-500/25 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Generating Account...</span>
                    </>
                  ) : (
                    <>
                      <Key className="w-3.5 h-3.5" />
                      <span>Generate Co-Admin</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: CREDENTIALS GENERATED (ONE-TIME VIEW) */}
      {/* ------------------------------------------------------------- */}
      {generatedCreds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden">
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-3">
                <CheckCircle2 className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold">Co-Admin Account Created!</h3>
              <p className="text-xs text-emerald-100 mt-1">
                Please copy and securely deliver these credentials to the officer. The temporary password must be changed upon first login.
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 font-mono text-xs">
                <div>
                  <span className="text-slate-400 font-sans block text-[10px] font-bold uppercase">Officer Name</span>
                  <span className="font-bold text-slate-800 text-sm font-sans">{generatedCreds.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-sans block text-[10px] font-bold uppercase">Admin ID</span>
                  <span className="font-black text-indigo-600 text-base">{generatedCreds.admin_code}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-sans block text-[10px] font-bold uppercase">Temporary Password</span>
                  <span className="font-black text-amber-600 text-base tracking-wider bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block">
                    {generatedCreds.temporary_password}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  The system enforces a mandatory password reset dialog the first time this account signs into the CivicFix portal.
                </span>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleCopyCredentials}
                  className="w-full btn-primary py-3 text-xs font-bold shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy Credentials'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGeneratedCreds(null)}
                  className="btn-secondary w-full py-2.5 text-xs font-semibold"
                >
                  Done & Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: EDIT PERMISSIONS */}
      {/* ------------------------------------------------------------- */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden">
            <div className="bg-slate-900 p-6 text-white">
              <h3 className="text-lg font-bold">Edit Municipal Permissions</h3>
              <p className="text-xs text-slate-300 mt-1">
                Updating access for <span className="font-bold text-white">{editingAdmin.name}</span> ({editingAdmin.admin_code})
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                {AVAILABLE_PERMISSIONS.map((p) => {
                  const checked = editPermissions.includes(p.id)
                  return (
                    <label
                      key={p.id}
                      className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-white cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditPermissions([...editPermissions, p.id])
                          } else {
                            setEditPermissions(editPermissions.filter((x) => x !== p.id))
                          }
                        }}
                        className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-800">{p.label}</p>
                        <p className="text-[11px] text-slate-500">{p.desc}</p>
                      </div>
                    </label>
                  )
                })}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="btn-secondary text-xs py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePermissions}
                  disabled={updatingPerms}
                  className="btn-primary text-xs py-2 px-5"
                >
                  {updatingPerms ? 'Saving...' : 'Save Permissions'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
