export default function PriorityMeter({ score }) {
  const capped = Math.min(Math.max(score || 0, 0), 100)

  let barColor = 'bg-green-500'
  if (capped >= 80) barColor = 'bg-red-500'
  else if (capped >= 60) barColor = 'bg-orange-500'
  else if (capped >= 40) barColor = 'bg-yellow-500'

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${capped}%` }}
        />
      </div>
      <span className={`text-xs font-bold w-8 text-right ${
        capped >= 80 ? 'text-red-600' : capped >= 60 ? 'text-orange-600' : capped >= 40 ? 'text-yellow-600' : 'text-green-600'
      }`}>
        {capped}
      </span>
    </div>
  )
}
