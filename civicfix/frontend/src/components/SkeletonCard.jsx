export default function SkeletonCard({ lines = 3, className = '' }) {
  return (
    <div className={`card space-y-3 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="skeleton w-10 h-10 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-3.5 w-3/4" />
          <div className="skeleton h-2.5 w-1/2" />
        </div>
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`skeleton h-2.5 ${i === lines - 1 ? 'w-1/3' : i % 2 === 0 ? 'w-full' : 'w-5/6'}`} />
      ))}
      <div className="flex gap-2 pt-1">
        <div className="skeleton h-7 w-20 rounded-lg" />
        <div className="skeleton h-7 w-16 rounded-lg" />
      </div>
    </div>
  )
}
