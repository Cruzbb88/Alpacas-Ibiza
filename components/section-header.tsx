import type { ReactNode } from 'react'

interface SectionHeaderProps {
  title: string | ReactNode
  subtitle?: string | ReactNode
  level?: 1 | 2 | 3
  alignment?: 'center' | 'left'
  className?: string
}

export function SectionHeader({
  title,
  subtitle,
  level = 2,
  alignment = 'center',
  className,
}: SectionHeaderProps) {
  const Tag = `h${level}` as 'h1' | 'h2' | 'h3'
  const alignClass = alignment === 'center' ? 'text-center' : 'text-left'

  return (
    <div className={`${alignClass} mb-12${className ? ` ${className}` : ''}`}>
      <Tag className="text-3xl md:text-4xl font-bold text-foreground mb-4">
        {title}
      </Tag>
      {subtitle && (
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {subtitle}
        </p>
      )}
    </div>
  )
}
