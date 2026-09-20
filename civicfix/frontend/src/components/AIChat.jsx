import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { X, Send, Brain, Loader2 } from 'lucide-react'

const AI_RESPONSES = [
  {
    keywords: ['urgent','critical','priority','today'],
    response: (stats) => `📊 Today's Priority Analysis:\n\n🔴 ${stats?.severities?.CRITICAL||0} critical issues\n🟠 ${stats?.severities?.HIGH||0} high-priority issues\n\nTop Concern: Water leakage reports are 23% above the weekly average in Ward 3.\n\n✅ Recommendation: Deploy Water Maintenance Team 2 to Ward 3 immediately. Estimated resolution window: 3–4 hours.`,
  },
  {
    keywords: ['garbage','sanitation','waste','dump'],
    response: () => `🗑️ Garbage & Sanitation Analysis:\n\nWard 8 has 37% more garbage complaints than the city average.\n\nTop locations:\n• Main Road Junction\n• Bus Stand Area\n• Market Zone\n\n✅ Recommendation: Increase pickup frequency in Ward 8 to twice daily. Estimated cost: ₹2,400/day additional.`,
  },
  {
    keywords: ['water','pipeline','leak','pipe'],
    response: () => `💧 Water Infrastructure Report:\n\n12 active water leakage complaints\n🚨 3 marked CRITICAL — immediate action needed\n\nAffected areas: Ward 3, Ward 12\nEstimated water loss: ~2,400 L/hour\n\n✅ Recommendation: Priority pipe repair in Ward 3. Request emergency maintenance crew deployment.`,
  },
  {
    keywords: ['ward','worst','most','problem'],
    response: () => `📍 Ward Performance Analysis:\n\n🔴 Ward 3: 14 open issues (highest)\n🟠 Ward 12: 11 open issues\n🟡 Ward 2: 8 open issues\n🟢 Ward 4: 3 open issues (best performing)\n\n✅ Recommendation: Allocate 2 additional field workers to Ward 3 for the next 7 days.`,
  },
  {
    keywords: ['resolved','done','completed','performance','rate'],
    response: (stats) => `📈 Performance Summary:\n\n✅ ${stats?.resolved||0} issues resolved\n📊 Resolution rate: ${stats?.total ? Math.round((stats.resolved/stats.total)*100) : 89}%\n⏱️ Average response time: 4.2 hours\n\nThis month vs last month: +12% improvement\n\n🏆 Top performing department: Water Works Dept — 94% resolution rate.`,
  },
  {
    keywords: ['drainage','drain','blockage','flood'],
    response: () => `🌊 Drainage & Flooding Report:\n\nCurrently active:\n• 5 drainage blockages\n• 2 waterlogging complaints (Ward 7, Ward 12)\n\nMonsoon risk: HIGH — 3 locations near flood-prone zones.\n\n✅ Recommendation: Deploy drainage maintenance team urgently. Pre-position sandbags at Ward 7.`,
  },
]

const WELCOME = 'Hello! I\'m CivicAI, your Municipal Intelligence Assistant. Ask me about:\n• Urgent or critical issues\n• Ward performance analysis\n• Water, garbage, or drainage complaints\n• Resolution performance metrics'

export default function AIChat({ isOpen, onClose }) {
  const [messages, setMessages] = useState([])
  const [input,    setInput]    = useState('')
  const [typing,   setTyping]   = useState(false)
  const [stats,    setStats]    = useState(null)
  const bottomRef = useRef()

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{ role:'ai', content: WELCOME, time: new Date() }])
    }
  }, [isOpen])

  useEffect(() => {
    axios.get('/api/dashboard/stats').then(({ data }) => setStats(data)).catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [messages, typing])

  const send = async () => {
    const text = input.trim()
    if (!text) return
    const userMsg = { role:'user', content: text, time: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setTyping(true)

    await new Promise(r => setTimeout(r, 1400))

    const lowered = text.toLowerCase()
    const match = AI_RESPONSES.find(r => r.keywords.some(k => lowered.includes(k)))
    const aiText = match
      ? match.response(stats)
      : 'I can help with:\n• Urgent civic issues\n• Ward performance analysis\n• Water / garbage complaints\n• Resolution performance\n\nTry asking about any of these topics!'

    setTyping(false)
    setMessages(prev => [...prev, { role:'ai', content: aiText, time: new Date() }])
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-end sm:justify-end pointer-events-none">
      {/* Backdrop (mobile only) */}
      <div
        className="absolute inset-0 bg-black/20 sm:hidden pointer-events-auto"
        onClick={onClose}
      />

      {/* Chat panel */}
      <div className="relative w-full sm:w-[380px] sm:m-4 slide-up pointer-events-auto">
        <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          style={{ height:'520px', maxHeight:'85vh' }}>

          {/* Header */}
          <div className="bg-gradient-to-r from-purple-700 to-indigo-700 px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-white text-sm">CivicAI</p>
              <p className="text-purple-200 text-xs">Municipal Intelligence Assistant</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-slate-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'ai' && (
                  <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center mr-2 shrink-0 mt-1">
                    <Brain className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className={`max-w-[80%] px-3 py-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-sm'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm shadow-sm'
                }`}>
                  {m.content}
                  <p className={`text-[10px] mt-1 ${m.role === 'user' ? 'text-indigo-300' : 'text-slate-400'}`}>
                    {m.time.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {typing && (
              <div className="flex items-end gap-2">
                <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center shrink-0">
                  <Brain className="w-3 h-3 text-white" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-3 py-2.5 shadow-sm">
                  <div className="flex gap-1 items-center">
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay:'0ms' }} />
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay:'150ms' }} />
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay:'300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick prompts */}
          <div className="px-3 py-2 border-t border-slate-100 overflow-x-auto">
            <div className="flex gap-1.5 whitespace-nowrap">
              {["Urgent issues today?","Worst ward?","Water leaks?","Garbage hotspots?","Resolution rate?"].map(q => (
                <button key={q} onClick={() => { setInput(q); setTimeout(send, 50) }}
                  className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-full font-semibold hover:bg-purple-100 shrink-0">
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-2 flex gap-2 border-t border-slate-100 bg-white">
            <input
              type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
              placeholder="Ask CivicAI anything…"
              className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-slate-50"
            />
            <button
              onClick={send} disabled={!input.trim() || typing}
              className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-xl flex items-center justify-center disabled:opacity-50"
            >
              {typing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
