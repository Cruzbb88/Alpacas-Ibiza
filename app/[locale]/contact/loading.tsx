import { Skeleton } from '@/components/ui/skeleton'

export default function ContactLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      {/* Hero */}
      <div className="py-20 px-4 text-center space-y-4">
        <Skeleton className="h-12 w-2/3 max-w-xl mx-auto" />
        <Skeleton className="h-6 w-1/2 max-w-md mx-auto" />
      </div>

      {/* Two-column layout: form + info */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Form column — 5 input rows + submit */}
          <div className="space-y-6">
            <Skeleton className="h-7 w-1/3 mb-2" />
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            ))}
            {/* Message textarea */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-32 w-full rounded-md" />
            </div>
            {/* Submit */}
            <Skeleton className="h-10 w-32 rounded-md" />
          </div>

          {/* Info column */}
          <div className="space-y-8">
            <Skeleton className="h-7 w-1/3 mb-2" />
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
