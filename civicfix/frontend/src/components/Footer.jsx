import React from 'react'
import { Link } from 'react-router-dom'
import {
  Globe, Mail, Briefcase, Github, ShieldCheck,
  Phone, Heart, MapPin, ArrowUpRight
} from 'lucide-react'

export default function Footer() {
  const user = JSON.parse(localStorage.getItem('civicfix_user') || 'null')

  return (
    <footer className="bg-slate-900 text-slate-400 text-sm border-t border-slate-800 transition-colors">
      {/* Upper Footer Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">

          {/* Col 1 & 2: Brand & Mission */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/home" className="flex items-center gap-2.5 inline-block">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <span className="text-xl">🏙️</span>
              </div>
              <div>
                <span className="text-white font-black text-xl tracking-tight">CIVIC<span className="text-blue-500">FIX</span></span>
                <p className="text-[10px] text-slate-400 font-medium -mt-0.5">Municipal Civic-Tech Intelligence</p>
              </div>
            </Link>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-sm">
              Making cities cleaner, safer and better. An AI-powered civic issue reporting and municipal dispatch platform built for Kakinada Municipal Corporation and Smart Cities.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-emerald-400 border border-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live in Kakinada
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-blue-400 border border-slate-700">
                <ShieldCheck className="w-3.5 h-3.5" />
                Data Privacy Protected
              </span>
            </div>
          </div>

          {/* Col 3: PLATFORM */}
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4">Platform</h4>
            <ul className="space-y-2.5 text-xs font-medium">
              <li>
                <Link to={user ? '/home' : '/'} className="hover:text-white transition-colors flex items-center gap-1">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="hover:text-white transition-colors flex items-center gap-1">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/report" className="hover:text-white transition-colors flex items-center gap-1">
                  Report an Issue
                </Link>
              </li>
              <li>
                <Link to="/map" className="hover:text-white transition-colors flex items-center gap-1">
                  Civic Map
                </Link>
              </li>
              <li>
                <Link to="/track" className="hover:text-white transition-colors flex items-center gap-1">
                  {user?.role === 'admin' ? 'All Complaints' : user?.role === 'worker' ? 'Assigned Tasks' : 'My Complaints'}
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: SUPPORT */}
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4">Support</h4>
            <ul className="space-y-2.5 text-xs font-medium">
              <li>
                <Link to="/how-it-works" className="hover:text-white transition-colors">
                  Help Center & FAQ
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <a href="tel:18004251818" className="hover:text-white transition-colors flex items-center gap-1">
                  <Phone className="w-3 h-3 text-blue-400" />
                  KMC Toll-Free: 1800-425-1818
                </a>
              </li>
              <li>
                <span className="text-slate-500">Sanitation Dept: 0884-2374144</span>
              </li>
              <li>
                <span className="text-slate-500">Water Supply: 0884-2374145</span>
              </li>
            </ul>
          </div>

          {/* Col 5: LEGAL & GOV */}
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4">Legal & Governance</h4>
            <ul className="space-y-2.5 text-xs font-medium">
              <li>
                <Link to="/about" className="hover:text-white transition-colors">
                  Privacy Policy (RBAC)
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-white transition-colors">
                  Citizen Charter
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-white transition-colors">
                  Accessibility Statement
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Divider */}
        <div className="my-8 border-t border-slate-800" />

        {/* Lower Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p className="text-slate-500 text-center sm:text-left">
            © 2026 <span className="text-slate-300 font-semibold">CivicFix</span>. All rights reserved. Developed for Kakinada Municipal Corporation Smart City Innovation.
          </p>

          {/* Social / Link Icons */}
          <div className="flex items-center gap-4 text-slate-400">
            <a href="https://kakinada.cdma.ap.gov.in/" target="_blank" rel="noopener noreferrer" title="Official KMC Portal" className="hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800">
              <Globe className="w-4 h-4" />
            </a>
            <Link to="/contact" title="Email Municipal Office" className="hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800">
              <Mail className="w-4 h-4" />
            </Link>
            <Link to="/about" title="Smart City Projects" className="hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800">
              <Briefcase className="w-4 h-4" />
            </Link>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" title="Open Source Repository" className="hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800">
              <Github className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}