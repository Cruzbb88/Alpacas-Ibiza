interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: { label: string; href: string }
}

export function EmptyState({
  icon = '🦙',
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <span className="text-5xl mb-4" aria-hidden="true">
        {icon}
      </span>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-foreground/60 max-w-sm mb-6">{description}</p>
      )}
      {action && (
        <a
          href={action.href}
          className="inline-flex px-5 py-2 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/90 transition-colors"
        >
          {action.label}
        </a>
      )}
    </div>
  )
}
