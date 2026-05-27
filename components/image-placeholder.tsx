import { cn } from '@/lib/utils'

interface ImagePlaceholderProps {
  label?: string
  aspectRatio?: 'square' | '4/3' | '16/9'
  className?: string
}

export function ImagePlaceholder({
  label,
  aspectRatio = 'square',
  className,
}: ImagePlaceholderProps) {
  const aspect = {
    square: 'aspect-square',
    '4/3': 'aspect-[4/3]',
    '16/9': 'aspect-video',
  }[aspectRatio]

  return (
    <div
      role="img"
      aria-label={label ?? 'Image coming soon'}
      className={cn(
        aspect,
        'bg-secondary/20 rounded-lg flex items-center justify-center border border-border',
        className,
      )}
    >
      <span className="text-sm text-foreground/30 text-center px-4 select-none">
        {label ?? 'Image coming soon'}
      </span>
    </div>
  )
}
