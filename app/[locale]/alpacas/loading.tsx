import { Skeleton } from '@/components/ui/skeleton'

export default function AlpacasLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      {/* Hero */}
      <div className="py-20 px-4 text-center space-y-4">
        <Skeleton className="h-12 w-2/3 max-w-2xl mx-auto" />
        <Skeleton className="h-6 w-1/2 max-w-lg mx-auto" />
      </div>

      {/* 14-card grid — matches AlpacaCard layout: portrait image + name + breed + traits */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 14 }, (_, i) => (
            <div key={i} className="rounded-lg overflow-hidden border border-border">
              {/* Portrait image — ~4:5 aspect ratio matches AlpacaCard */}
              <Skeleton className="w-full aspect-[4/5]" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
