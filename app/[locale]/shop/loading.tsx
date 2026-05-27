import { Skeleton } from '@/components/ui/skeleton'

export default function ShopLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      {/* Hero */}
      <div className="py-20 px-4 text-center space-y-4">
        <Skeleton className="h-12 w-2/3 max-w-xl mx-auto" />
        <Skeleton className="h-6 w-1/2 max-w-md mx-auto" />
      </div>

      {/* 3-category grid — matches ShopPage md:grid-cols-3 layout */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-lg border border-border p-8 space-y-4">
              {/* Icon */}
              <Skeleton className="h-12 w-12 rounded-md" />
              {/* Title */}
              <Skeleton className="h-7 w-2/3" />
              {/* Description */}
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              {/* CTA link */}
              <Skeleton className="h-5 w-24 mt-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
