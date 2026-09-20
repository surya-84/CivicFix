const SEVERITY_CONFIG = {
  CRITICAL: { bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-300',    dot: 'bg-red-500',    label: '🚨 CRITICAL' },
  HIGH:     { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', dot: 'bg-orange-500', label: '🔴 HIGH'     },
  MODERATE: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300', dot: 'bg-yellow-500', label: '🟡 MODERATE' },
  LOW:      { bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-300',  dot: 'bg-green-500',  label: '🟢 LOW'      },
}

export default function SeverityBadge({ severity, size = 'sm' }) {
  const cfg = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.MODERATE
  const px  = size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2 py-0.5 text-xs'

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border} ${px}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}
