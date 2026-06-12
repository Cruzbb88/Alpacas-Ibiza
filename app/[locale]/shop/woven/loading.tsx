// Route-level loading skeleton — shown during SSR/navigation so this
// shop page never flashes a blank screen. Tokens only.
export default function Loading() {
  return (
    <div className="animate-pulse" role="status" aria-label="Loading…">
      <div className="h-[50vh] min-h-[300px] w-full bg-muted" />
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="rounded-lg border border-border overflow-hidden">
              <div className="h-48 bg-muted" />
              <div className="p-6 space-y-3">
                <div className="h-4 w-1/2 rounded bg-muted" />
                <div className="h-9 w-full rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
