import { Brain, CheckCircle, AlertTriangle } from 'lucide-react'
import SeverityBadge from './SeverityBadge'

export default function AIAnalysisPanel({ result, loading }) {
  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3 animate-pulse">
        <Brain className="w-6 h-6 text-blue-500 shrink-0" />
        <div>
          <p className="font-semibold text-blue-700">AI is analysing your photo…</p>
          <p className="text-sm text-blue-500">Classifying issue and estimating severity</p>
        </div>
      </div>
    )
  }

  if (!result) return null

  const confidencePct = Math.round((result.confidence || 0) * 100)

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Brain className="w-5 h-5 text-blue-600 shrink-0" />
        <span className="font-bold text-blue-800 text-sm">🤖 AI Analysis Complete</span>
      </div>

      {/* Label + confidence */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-lg font-bold text-slate-800">{result.label}</p>
          <p className="text-sm text-slate-600 mt-0.5">{result.description}</p>
        </div>
        <div className="text-right shrink-0">
          <div className={`text-2xl font-black ${confidencePct >= 90 ? 'text-green-600' : 'text-blue-600'}`}>
            {confidencePct}%
          </div>
          <div className="text-xs text-slate-500">confidence</div>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="bg-white rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-700"
          style={{ width: `${confidencePct}%` }}
        />
      </div>

      {/* Severity */}
      <div className="flex items-center gap-2 pt-1">
        <span className="text-sm text-slate-600 font-medium">Detected Severity:</span>
        <SeverityBadge severity={result.severity} size="lg" />
      </div>

      {/* Hint */}
      <div className="flex items-start gap-1.5 bg-white bg-opacity-70 rounded-lg p-2.5">
        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
        <p className="text-xs text-slate-600">
          AI has auto-selected the category. You can override it below if needed.
        </p>
      </div>
    </div>
  )
}
