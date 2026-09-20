import React, { useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { KeyRound, ShieldAlert, CheckCircle2, Lock, Eye, EyeOff, LogOut } from 'lucide-react'

export default function ChangePasswordModal({ isOpen, onSuccess, onLogout }) {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!oldPassword) {
      setError('Please enter your current/temporary password')
      return
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long')
      return
    }
    if (newPassword === oldPassword) {
      setError('New password cannot be the same as your temporary password')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    try {
      setLoading(true)
      const token = localStorage.getItem('civicfix_token')
      const res = await axios.post('/api/auth/change-password', {
        old_password: oldPassword,
        new_password: newPassword,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      // Update local storage user object
      const storedUser = JSON.parse(localStorage.getItem('civicfix_user') || '{}')
      const updatedUser = { ...storedUser, must_change_password: false }
      localStorage.setItem('civicfix_user', JSON.stringify(updatedUser))

      toast.success('Password updated successfully! Welcome to CivicFix.')
      if (onSuccess) onSuccess(updatedUser)
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to update password. Please check your credentials.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden">
        {/* Modal Header */}
        <div className="bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 p-6 text-white relative">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-3 ring-4 ring-white/10 shadow-inner">
            <KeyRound className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Mandatory Password Setup</h2>
          <p className="text-xs text-amber-100 mt-1 leading-relaxed">
            First-time login detected. For municipal security protocols, you must replace your temporary password with a permanent one before accessing the portal.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Current / Temporary Password */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Temporary / Current Password
            </label>
            <div className="relative">
              <input
                type={showOld ? 'text' : 'password'}
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Enter temporary password provided by Super Admin"
                className="input-field pr-10 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowOld(!showOld)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Create New Password
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters (e.g. letters, numbers)"
                className="input-field pr-10 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {newPassword.length > 0 && (
              <div className="mt-1.5 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      newPassword.length >= 8
                        ? 'bg-emerald-500 w-full'
                        : newPassword.length >= 6
                        ? 'bg-amber-500 w-2/3'
                        : 'bg-red-500 w-1/3'
                    }`}
                  />
                </div>
                <span className="text-[10px] font-semibold text-slate-400">
                  {newPassword.length >= 8 ? 'Strong' : newPassword.length >= 6 ? 'Acceptable' : 'Too Short'}
                </span>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your new password"
              className="input-field text-sm"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 flex flex-col gap-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-sm font-bold shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Set Password & Access Portal</span>
                </>
              )}
            </button>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log out and update later</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
