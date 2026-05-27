'use client'

export function OfflineContent() {
  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16 text-center">
      <span className="text-6xl mb-6" aria-hidden="true">🦙</span>
      <h1 className="text-3xl font-bold text-foreground mb-4">You&apos;re offline</h1>
      <p className="text-foreground/70 max-w-md mb-6">
        Looks like the connection dropped. Some pages you&apos;ve already visited are still available;
        for booking we&apos;ll need internet to talk to FareHarbor.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90"
      >
        Try again
      </button>
    </main>
  )
}
