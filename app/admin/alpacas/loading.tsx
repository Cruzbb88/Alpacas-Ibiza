export default function Loading() {
  return (
    <div className="min-h-screen bg-background p-8" aria-busy="true" aria-live="polite">
      <div className="max-w-3xl mx-auto animate-pulse space-y-6">
        {/* Title */}
        <div className="h-8 w-48 bg-foreground/10 rounded" />
        <div className="h-5 w-80 bg-foreground/10 rounded" />

        {/* Alpaca list rows */}
        <div className="divide-y divide-neutral-200 rounded border border-neutral-200">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex items-center justify-between p-4">
              <div className="space-y-1">
                <div className="h-5 w-32 bg-foreground/10 rounded" />
                <div className="h-3 w-20 bg-foreground/10 rounded" />
              </div>
              <div className="h-5 w-16 bg-foreground/10 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
