import React, { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Phone, User, CheckCircle2, ShieldCheck, ArrowRight, X } from 'lucide-react'

export default function CompleteProfileModal({ isOpen, onClose, onSuccess }) {
  const [googleInfo, setGoogleInfo] = useState({ name: '', email: '', picture: '' })
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [loadingInfo, setLoadingInfo] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return

    let isMounted = true
    async function fetchPendingInfo() {
      setLoadingInfo(true)
      setError('')
      try {
        const { data } = await axios.get('/api/auth/google/pending-info', {
          withCredentials: true,
        })
        if (isMounted) {
          setGoogleInfo(data)
          setName(data.name || '')
        }
      } catch (err) {
        if (isMounted) {
          const msg = err.response?.data?.detail || 'Google sign-in session expired. Please sign in again.'
          setError(msg)
          toast.error(msg)
        }
      } finally {
        if (isMounted) {
          setLoadingInfo(false)
        }
      }
    }

    fetchPendingInfo()

    return () => {
      isMounted = false
    }
  }, [isOpen])

  if (!isOpen) return null

  const validatePhone = (num) => {
    const cleaned = num.replace(/\D/g, '')
    return /^[6-9]\d{9}$/.test(cleaned)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const cleanedPhone = phone.replace(/\D/g, '')
    if (!validatePhone(cleanedPhone)) {
      setError('Please enter a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9).')
      return
    }

    setSubmitting(true)
    try {
      const { data } = await axios.post(
        '/api/auth/complete-google-profile',
        {
          phone: cleanedPhone,
          name: name.trim() || googleInfo.name || 'Citizen',
        },
        { withCredentials: true }
      )

      localStorage.setItem('civicfix_token', data.access_token)
      localStorage.setItem('civicfix_user', JSON.stringify({
        user_id: data.user_id,
        name: data.name,
        role: data.role,
        email: data.email,
        phone: data.phone,
        profile_picture: data.profile_picture,
        auth_provider: data.auth_provider,
        access_token: data.access_token,
        is_profile_complete: true,
        permissions: [],
      }))

      toast.success(`Welcome to CivicFix, ${data.name}!`)
      if (onSuccess) {
        onSuccess(data)
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to complete registration. Please check your mobile number.'
      setError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-white/80 hover:text-white bg-black/20 hover:bg-black/30 p-1.5 rounded-full transition-colors z-10"
          title="Cancel"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 p-6 text-white relative">
          <div className="flex items-center gap-3 mb-2">
            {googleInfo.picture ? (
              <img
                src={googleInfo.picture}
                alt={googleInfo.name || 'User'}
                className="w-12 h-12 rounded-full border-2 border-white/50 object-cover shadow-sm"
              />
            ) : (
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center ring-2 ring-white/20">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold tracking-tight">Complete Citizen Profile</h2>
              <p className="text-xs text-blue-200 font-medium">1-Step Civic Verification</p>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed mt-2">
            You have authenticated with Google. Please link your active mobile number to submit complaints and receive SMS updates.
          </p>
        </div>

        {/* Modal Body */}
        {loadingInfo ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-500">Retrieving Google profile...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium leading-tight">
                {error}
              </div>
            )}

            {/* Verified Email Banner */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="min-w-0 pr-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Verified Email</p>
                <p className="text-xs font-semibold text-slate-700 truncate">{googleInfo.email}</p>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold shrink-0">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Verified
              </span>
            </div>

            {/* Name input (prefilled) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full bg-white rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* 10-digit Phone input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400">10 Digits</span>
              </div>
              <div className="relative flex rounded-xl border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 bg-white">
                <span className="inline-flex items-center px-3 text-xs font-bold text-slate-600 bg-slate-50 border-r border-slate-200">
                  +91
                </span>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={phone}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, '')
                    setPhone(cleaned)
                  }}
                  placeholder="9876543210"
                  className="w-full py-2.5 px-3 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none"
                  autoFocus
                />
                <div className="pr-3 flex items-center text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                Used strictly for complaint resolution notifications and OTP updates.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="w-1/3 py-2.5 px-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || phone.length !== 10}
                className="w-2/3 py-2.5 px-4 rounded-xl text-white font-extrabold text-xs tracking-wide bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span>Complete & Enter</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
