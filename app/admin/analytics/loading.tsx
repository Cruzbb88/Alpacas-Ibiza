export default function Loading() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto animate-pulse space-y-8">
        {/* Title */}
        <div className="h-9 w-64 bg-foreground/10 rounded" />

        {/* 4-card metrics row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="h-24 bg-foreground/10 rounded" />
          <div className="h-24 bg-foreground/10 rounded" />
          <div className="h-24 bg-foreground/10 rounded" />
          <div className="h-24 bg-foreground/10 rounded" />
        </div>

        {/* Top Pages card */}
        <div className="h-64 bg-foreground/10 rounded" />
      </div>
    </div>
  )
}
