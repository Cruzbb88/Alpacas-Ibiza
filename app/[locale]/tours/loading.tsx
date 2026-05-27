import { Skeleton } from '@/components/ui/skeleton'

export default function ToursLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      {/* Hero */}
      <div className="py-20 px-4 text-center space-y-4">
        <Skeleton className="h-12 w-2/3 max-w-2xl mx-auto" />
        <Skeleton className="h-6 w-1/2 max-w-lg mx-auto" />
        <Skeleton className="h-10 w-36 mx-auto rounded-full" />
      </div>

      {/* 4-card tour types grid */}
      <div className="container mx-auto px-4 py-12">
        <Skeleton className="h-8 w-1/3 max-w-xs mb-2" />
        <Skeleton className="h-5 w-1/2 max-w-sm mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-9 w-28 rounded-md" />
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="container mx-auto px-4 py-12">
        <Skeleton className="h-8 w-1/3 max-w-xs mb-8" />
        <div className="space-y-6">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-5 w-16 shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="container mx-auto px-4 py-12">
        <Skeleton className="h-8 w-1/4 max-w-xs mb-8" />
        <div className="space-y-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      </div>

      {/* Booking widget */}
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Skeleton className="h-8 w-1/2 mx-auto mb-4" />
        <Skeleton className="h-5 w-2/3 mx-auto mb-8" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </div>
  )
}
