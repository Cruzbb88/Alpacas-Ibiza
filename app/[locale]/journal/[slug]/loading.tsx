import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      {/* Hero image strip */}
      <Skeleton className="w-full aspect-[16/6]" />

      {/* Article body */}
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-4">
        {/* Meta line */}
        <Skeleton className="h-4 w-48" />
        {/* Title */}
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-4/5" />
        {/* Excerpt */}
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-3/4" />
        {/* Body paragraphs */}
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
        <Skeleton className="h-5 w-2/3" />
      </div>
    </div>
  )
}
