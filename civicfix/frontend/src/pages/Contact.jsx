import React, { useState } from 'react'
import {
  Phone, Mail, MapPin, Clock, Send, CheckCircle2,
  AlertCircle, ShieldCheck
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function Contact() {
  const [form, setForm] = useState({ name: '', phone: '', department: 'Sanitation', message: '' })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.phone || !form.message) {
      toast.error('Please enter phone and message')
      return
    }
    setSubmitted(true)
    toast.success('Inquiry submitted to Kakinada Municipal Corporation!')
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-10">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <MapPin className="w-3.5 h-3.5 text-blue-600" />
            Kakinada Municipal Corporation Support
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Contact & <span className="text-blue-600">Helpline</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto">
            Get in touch with KMC ward officers, emergency municipal hotlines, or send a non-emergency inquiry directly to the city administration.
          </p>
        </div>

        {/* Emergency Hotlines Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-2">
            <span className="text-2xl">🚨</span>
            <h3 className="font-bold text-red-900 text-sm">Emergency Sanitation</h3>
            <p className="text-xs text-red-700">Immediate response for major blockages and hazardous waste</p>
            <p className="text-lg font-black text-red-900 font-mono pt-1">1800-425-1818</p>
            <span className="inline-block text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">24x7 Toll Free</span>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-2">
            <span className="text-2xl">💧</span>
            <h3 className="font-bold text-blue-900 text-sm">Water Pipeline Supply</h3>
            <p className="text-xs text-blue-700">Pipeline bursts, water contamination, and tanker requests</p>
            <p className="text-lg font-black text-blue-900 font-mono pt-1">0884-2374145</p>
            <span className="inline-block text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">6 AM – 10 PM</span>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-2">
            <span className="text-2xl">🏛️</span>
            <h3 className="font-bold text-emerald-900 text-sm">Municipal Commissioner Office</h3>
            <p className="text-xs text-emerald-700">General civic inquiries, RTI, and grievance redressal</p>
            <p className="text-lg font-black text-emerald-900 font-mono pt-1">0884-2374144</p>
            <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Mon – Sat, 10 AM – 5 PM</span>
          </div>
        </div>

        {/* Contact Form & Office Address */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

          {/* Form */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-5">
            <div>
              <h2 className="text-lg font-black text-slate-800">Send an Inquiry to KMC</h2>
              <p className="text-xs text-slate-500 mt-1">Our municipal help desk will respond within 24 hours</p>
            </div>

            {submitted ? (
              <div className="py-10 text-center space-y-3">
                <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Inquiry Received!</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Reference #{Math.floor(100000 + Math.random() * 900000)} generated. A representative from the {form.department} team will contact {form.phone}.
                </p>
                <button
                  onClick={() => { setSubmitted(false); setForm({ name: '', phone: '', department: 'Sanitation', message: '' }) }}
                  className="btn-secondary text-xs mt-2 inline-flex"
                >
                  Send Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Your Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Ravi Kumar"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Department</label>
                  <select
                    value={form.department}
                    onChange={e => setForm({ ...form, department: e.target.value })}
                    className="input-field"
                  >
                    <option value="Sanitation">Sanitation & Solid Waste Management</option>
                    <option value="Water Works">Water Supply & Pipeline Maintenance</option>
                    <option value="Drainage">Storm Water Drainage</option>
                    <option value="Public Works">Roads & Streetlights</option>
                    <option value="Commissioner Office">Commissioner Office / General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Message / Question *</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Describe your inquiry or grievance..."
                    value={form.message}
                    onChange={e => setForm({ ...form, message: e.target.value })}
                    className="input-field resize-none"
                  />
                </div>

                <button type="submit" className="btn-primary w-full py-3 text-sm">
                  <Send className="w-4 h-4" />
                  Submit Municipal Inquiry
                </button>
              </form>
            )}
          </div>

          {/* Physical Address & Details */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 space-y-4 shadow-sm">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                Headquarters Address
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Kakinada Municipal Corporation Office<br />
                Subhash Road, Near Cinema Hall Junction,<br />
                Kakinada, East Godavari District,<br />
                Andhra Pradesh – 533001, India.
              </p>

              <div className="pt-2 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Public Hours: Monday – Saturday (10:00 AM to 5:00 PM)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>commissioner.kmc@gov.in</span>
                </div>
              </div>
            </div>

            {/* Note about Civic Issues */}
            <div className="bg-blue-50 border border-blue-200 rounded-3xl p-6 space-y-3">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                <AlertCircle className="w-4 h-4 text-blue-600" />
                Want to report a civic problem?
              </div>
              <p className="text-xs text-blue-800 leading-relaxed">
                For street garbage, leaking pipes, or broken roads, please use the <b>Report Issue</b> feature with a photograph and GPS rather than this inquiry form. The AI will automatically route it to the exact ward officer.
              </p>
              <a
                href="/report"
                className="inline-block text-xs font-bold text-blue-700 bg-white border border-blue-300 px-3.5 py-2 rounded-xl hover:bg-blue-50 transition-colors"
              >
                Go to AI Issue Reporter →
              </a>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}