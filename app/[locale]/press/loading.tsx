// Route-level loading skeleton — shown during SSR/navigation so this
// content page never flashes a blank screen. Tokens only.
export default function Loading() {
  return (
    <div className="animate-pulse" role="status" aria-label="Loading…">
      <div className="h-[40vh] min-h-[240px] w-full bg-muted" />
      <div className="mx-auto max-w-4xl px-4 py-12 space-y-4">
        <div className="h-8 w-2/3 rounded bg-muted" />
        <div className="h-4 w-full rounded bg-muted" />
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div className="h-24 rounded bg-muted" />
          <div className="h-24 rounded bg-muted" />
          <div className="h-24 rounded bg-muted" />
          <div className="h-24 rounded bg-muted" />
        </div>
      </div>
    </div>
  )
}
