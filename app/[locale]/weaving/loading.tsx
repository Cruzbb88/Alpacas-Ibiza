// Route-level loading skeleton — shown during SSR/navigation so this
// content page never flashes a blank screen. Tokens only.
export default function Loading() {
  return (
    <div className="animate-pulse" role="status" aria-label="Loading…">
      <div className="h-[50vh] min-h-[300px] w-full bg-muted" />
      <div className="mx-auto max-w-4xl px-4 py-12 space-y-4">
        <div className="h-8 w-2/3 rounded bg-muted" />
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-5/6 rounded bg-muted" />
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="h-40 rounded bg-muted" />
          <div className="h-40 rounded bg-muted" />
          <div className="h-40 rounded bg-muted" />
        </div>
      </div>
    </div>
  )
}
