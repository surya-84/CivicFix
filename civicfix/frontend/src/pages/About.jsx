import React from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck, Brain, MapPin, Eye, Zap, Lock,
  Users, Building2, CheckCircle2, ArrowRight, Heart
} from 'lucide-react'

export default function About() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-12">

        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            Smart City Governance Initiative
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            About <span className="text-blue-600">CivicFix</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            CivicFix is a next-generation civic-tech platform designed for Kakinada Municipal Corporation. It bridges citizens and city administrators through automated AI classification, precision GIS dispatch, and a secure role-based access model.
          </p>
        </div>

        {/* Security & Access Model Card (Highlighting User Prompt) */}
        <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-blue-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <Lock className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black">Strict Role-Based Privacy (RBAC)</h2>
              <p className="text-xs text-indigo-300">Enforced at the Database and API layer</p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            CivicFix protects citizen privacy. Unlike basic CRUD apps where all entries are visible, our backend strictly checks user credentials via cryptographic JWT tokens:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            <div className="bg-white/10 rounded-2xl p-4 border border-white/10">
              <span className="text-2xl">👤</span>
              <h3 className="font-bold text-sm text-white mt-2">Public / Citizen</h3>
              <p className="text-xs text-slate-300 mt-1">
                Only sees complaints submitted by themselves. Direct queries to another citizen's issue return <b>404 Not Found</b> to prevent ID enumeration.
              </p>
            </div>
            <div className="bg-white/10 rounded-2xl p-4 border border-white/10">
              <span className="text-2xl">🧑‍🔧</span>
              <h3 className="font-bold text-sm text-white mt-2">Field Worker</h3>
              <p className="text-xs text-slate-300 mt-1">
                Only views and updates complaints explicitly assigned to their department or field team. Cannot access administrative records.
              </p>
            </div>
            <div className="bg-white/10 rounded-2xl p-4 border border-white/10">
              <span className="text-2xl">🛡️</span>
              <h3 className="font-bold text-sm text-white mt-2">Municipal Admin</h3>
              <p className="text-xs text-slate-300 mt-1">
                Full command center visibility: priority queues, ward heatmaps, worker dispatching, severity overrides, and city-wide analytics.
              </p>
            </div>
          </div>
        </div>

        {/* 4 Core Pillars */}
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-black text-slate-900">Platform Innovation Pillars</h2>
            <p className="text-sm text-slate-500 mt-1">How AI and civic tech modernize municipal response</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-3">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <Brain className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">1. Automated AI Classification</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                When a citizen photographs garbage, pipeline leaks, or road damage, the AI vision model identifies the issue type, confidence level, and severity index within 1.2 seconds, eliminating miscategorization.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-3">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">2. Precision GIS & Ward Routing</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Coordinates are mapped to Kakinada municipal wards and automatically routed to the responsible department (Water Works, Sanitation, Drainage, or Public Works) and local ward officer.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-3">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">3. Dynamic 0–100 Priority Scoring</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Complaints are prioritized based on AI severity, citizen cluster count (duplicate reports), proximity to schools and hospitals, and duration pending, so critical issues get resolved first.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-3">
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">4. Delivery-Style Tracking & Audit Log</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Citizens follow their complaint through an interactive timeline (Reported → AI Verified → Worker Assigned → In Progress → Resolved) and provide satisfaction feedback.
              </p>
            </div>
          </div>
        </div>

        {/* Demo Credentials Box */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 space-y-3">
          <h3 className="font-bold text-amber-900 text-sm flex items-center gap-2">
            <span>🎮</span> Pre-Configured Demo Accounts for Presentation
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-white p-3 rounded-xl border border-amber-200/80">
              <p className="font-bold text-slate-800">Citizen 1 (Ravi Kumar)</p>
              <p className="text-slate-500 font-mono mt-0.5">Phone: 9000000001</p>
              <p className="text-slate-500 font-mono">Pass: citizen123</p>
              <p className="text-[10px] text-emerald-600 mt-1 font-semibold">Has 5 own complaints</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-amber-200/80">
              <p className="font-bold text-slate-800">Worker (Field Team)</p>
              <p className="text-slate-500 font-mono mt-0.5">Phone: 9000000002</p>
              <p className="text-slate-500 font-mono">Pass: worker123</p>
              <p className="text-[10px] text-amber-600 mt-1 font-semibold">Sees assigned tasks</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-amber-200/80">
              <p className="font-bold text-slate-800">Admin (KMC Officer)</p>
              <p className="text-slate-500 font-mono mt-0.5">Phone: 9000000003</p>
              <p className="text-slate-500 font-mono">Pass: admin123</p>
              <p className="text-[10px] text-purple-600 mt-1 font-semibold">Full command center</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center pt-4">
          <Link
            to="/report"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/25 transition-all"
          >
            Try Reporting an Issue
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </div>
  )
}