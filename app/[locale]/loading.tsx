import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-16" aria-busy="true" aria-live="polite">
      <Skeleton className="h-12 w-3/4 max-w-2xl mb-4" />
      <Skeleton className="h-6 w-1/2 max-w-md mb-12" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    </div>
  )
}
