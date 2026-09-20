import React from 'react'
import { Link } from 'react-router-dom'
import {
  Camera, Brain, MapPin, CheckCircle2, ArrowRight,
  ShieldCheck, Clock, Users, HelpCircle
} from 'lucide-react'

const STEPS = [
  {
    step: '01',
    icon: Camera,
    title: 'Snap & Capture GPS',
    color: 'from-blue-500 to-indigo-600',
    desc: 'Citizen captures a photograph of any civic problem — overflowing trash, burst pipeline, waterlogged road, or open drain. GPS coordinates are automatically tagged with high precision.',
  },
  {
    step: '02',
    icon: Brain,
    title: 'AI Analysis & Severity Scoring',
    color: 'from-indigo-600 to-purple-600',
    desc: 'Our computer vision engine recognizes the anomaly, checks for duplicate citizen reports in the same 50m radius, and calculates a 0–100 dynamic priority score based on severity and health risk.',
  },
  {
    step: '03',
    icon: MapPin,
    title: 'Automated Ward & Worker Dispatch',
    color: 'from-amber-500 to-orange-600',
    desc: 'The platform identifies the municipal ward (Ward 1 to 14) and assigns the ticket directly to the appropriate team (Water Works, Sanitation, or Drainage) and mobile field worker.',
  },
  {
    step: '04',
    icon: CheckCircle2,
    title: 'Resolution & Citizen Approval',
    color: 'from-emerald-500 to-green-600',
    desc: 'Field worker arrives on site, performs the repair, and uploads an "after" verification photo. The citizen receives a Swiggy-style delivery tracking update and provides thumbs up/down feedback.',
  },
]

const FAQS = [
  {
    q: 'Can other citizens see my personal contact information or complaints?',
    a: 'No. CivicFix enforces strict Role-Based Access Control (RBAC) at the database layer. When you log in as a citizen, you only have access to your own complaints under "My Complaints". The public map only displays anonymized marker locations.',
  },
  {
    q: 'What happens if 5 people report the same garbage pile?',
    a: 'CivicFix uses Haversine geospatial grouping. Instead of creating 5 duplicate tasks, it increments the report count and increases the priority score, escalating the issue to high urgency.',
  },
  {
    q: 'How does a field worker use the app?',
    a: 'Field workers log into their dedicated worker portal. They receive turn-by-turn navigation via Google Maps, click "Start Work", and upload an after photo for AI verification when complete.',
  },
  {
    q: 'What if a complaint is marked resolved but the problem is still there?',
    a: 'Citizens can click "Not Fixed" (thumbs down) in their tracking timeline. This immediately reopens the complaint, flags it as "reopened" on the municipal dashboard, and notifies the supervisor.',
  },
]

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-16">

        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            End-to-End Workflow
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            How <span className="text-blue-600">CivicFix</span> Works
          </h1>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            From photo capture on the road to worker verification and citizen approval — discover how our AI municipal engine operates.
          </p>
        </div>

        {/* 4 Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {STEPS.map((s) => {
            const Icon = s.icon
            return (
              <div key={s.step} className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-4 relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center text-white shadow-md`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-3xl font-black text-slate-200 group-hover:text-blue-100 transition-colors">
                    {s.step}
                  </span>
                </div>

                <h3 className="text-lg font-black text-slate-900">{s.title}</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{s.desc}</p>
              </div>
            )
          })}
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Frequently Asked Questions</h2>
              <p className="text-xs text-slate-500">Security, privacy, and municipal operations</p>
            </div>
          </div>

          <div className="space-y-4 divide-y divide-slate-100">
            {FAQS.map((faq, i) => (
              <div key={i} className={`${i > 0 ? 'pt-4' : ''} space-y-1.5`}>
                <h4 className="font-bold text-slate-800 text-sm">{faq.q}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="text-center pt-2">
          <Link
            to="/report"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-all"
          >
            File a Complaint in 60 Seconds
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </div>
  )
}