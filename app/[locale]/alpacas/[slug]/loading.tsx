import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      {/* Breadcrumb placeholder */}
      <div className="px-4 py-3">
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Hero — mirrors AlpacaDetailHero: full-width image + title + traits */}
      <div className="max-w-5xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-2 gap-10">
        <Skeleton className="w-full aspect-[4/5] rounded-xl" />
        <div className="space-y-4 pt-2">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-12 w-40 rounded-lg" />
        </div>
      </div>

      {/* Peer-herd strip */}
      <div className="bg-muted py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <Skeleton className="h-7 w-48 mb-6" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="w-full aspect-square rounded-lg" />
                <Skeleton className="h-4 w-3/4 mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
