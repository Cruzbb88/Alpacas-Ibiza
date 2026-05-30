import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      {/* Breadcrumb */}
      <div className="px-4 py-3">
        <Skeleton className="h-4 w-40" />
      </div>

      {/* Hero — mirrors GradientPageHero: title + subtitle */}
      <div className="w-full py-20 px-4 bg-gradient-to-br from-primary/10 to-accent/10">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <Skeleton className="h-12 w-3/4 mx-auto" />
          <Skeleton className="h-6 w-1/2 mx-auto" />
        </div>
      </div>

      {/* Adopter counter + picker area */}
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-6">
        <Skeleton className="h-10 w-56 mx-auto" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      </div>

      {/* Tier cards */}
      <div className="max-w-2xl mx-auto px-4 pb-16">
        <Skeleton className="h-8 w-48 mx-auto mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}
