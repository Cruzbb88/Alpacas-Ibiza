export default function Loading() {
  return (
    <div className="min-h-screen bg-background p-8" aria-busy="true" aria-live="polite">
      <div className="max-w-4xl mx-auto animate-pulse space-y-6">
        {/* Title */}
        <div className="h-8 w-56 bg-foreground/10 rounded" />

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-20 bg-foreground/10 rounded" />
          ))}
        </div>

        {/* Table */}
        <div className="h-64 bg-foreground/10 rounded" />
      </div>
    </div>
  )
}
