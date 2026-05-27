/**
 * app/loading.tsx — global loading UI shown during root-level route transitions.
 * Rendered by Next.js Suspense while a route segment streams.
 * Kept minimal — no header/footer (root layout handles those).
 */
export default function GlobalLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      {/* Brand logo mark */}
      <span className="text-5xl" aria-hidden="true">🦙</span>
      {/* Spinning ring */}
      <div
        className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin"
        role="status"
        aria-label="Loading"
      />
    </div>
  )
}
