import { CheckCircle, Clock, AlertCircle, Wrench, RotateCcw } from 'lucide-react'

const STEPS = [
  { key: 'pending',     label: 'Submitted',    icon: CheckCircle },
  { key: 'assigned',    label: 'Assigned',     icon: Clock },
  { key: 'in_progress', label: 'In Progress',  icon: Wrench },
  { key: 'resolved',    label: 'Resolved',     icon: CheckCircle },
]

const STATUS_ORDER = ['pending', 'assigned', 'in_progress', 'resolved']

export default function StatusTimeline({ status }) {
  const currentIdx = STATUS_ORDER.indexOf(status)
  const isReopened = status === 'reopened'

  if (isReopened) {
    return (
      <div className="flex items-center gap-2 text-orange-600 font-medium text-sm">
        <RotateCcw className="w-4 h-4" />
        Complaint Reopened — Pending Re-resolution
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      {STEPS.map((step, idx) => {
        const Icon      = step.icon
        const done      = idx < currentIdx
        const active    = idx === currentIdx
        const isLast    = idx === STEPS.length - 1

        return (
          <div key={step.key} className="flex items-center">
            <div className={`flex flex-col items-center gap-0.5`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors ${
                done   ? 'bg-blue-600 border-blue-600 text-white' :
                active ? 'bg-white border-blue-600 text-blue-600' :
                         'bg-white border-slate-300 text-slate-400'
              }`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span className={`text-[10px] font-medium ${
                done || active ? 'text-blue-600' : 'text-slate-400'
              }`}>
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div className={`h-0.5 w-8 mx-0.5 mb-4 ${idx < currentIdx ? 'bg-blue-600' : 'bg-slate-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
