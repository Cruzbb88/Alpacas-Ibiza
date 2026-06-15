import type { HTMLInputTypeAttribute, Ref } from 'react'

interface FormFieldProps {
  id: string
  label: string
  name: string
  type?: HTMLInputTypeAttribute
  required?: boolean
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  multiline?: boolean
  rows?: number
  hint?: string
  /** ID of an external error element to point aria-describedby at */
  errorId?: string
  invalid?: boolean
  autoComplete?: string
  placeholder?: string
  inputRef?: Ref<HTMLInputElement> | Ref<HTMLTextAreaElement>
  /** Visually hides the label (keeps it in the a11y tree) */
  srOnly?: boolean
  className?: string
  inputClassName?: string
}

const INPUT_BASE =
  'w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary'

export function FormField({
  id,
  label,
  name,
  type = 'text',
  required,
  value,
  onChange,
  multiline = false,
  rows,
  hint,
  errorId,
  invalid = false,
  autoComplete,
  placeholder,
  inputRef,
  srOnly = false,
  className,
  inputClassName,
}: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined

  // Build aria-describedby: hint first, then error (if present)
  const describedBy =
    [hintId, errorId].filter(Boolean).join(' ') || undefined

  const labelClass = srOnly
    ? 'sr-only'
    : 'block text-sm font-medium text-foreground mb-2'

  const sharedProps = {
    id,
    name,
    required: required ?? false,
    value,
    onChange,
    autoComplete,
    placeholder,
    'aria-required': required ? (true as const) : undefined,
    'aria-invalid': invalid ? (true as const) : undefined,
    'aria-describedby': describedBy,
    className: inputClassName ?? INPUT_BASE,
  }

  return (
    <div className={className}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground mb-1">
          {hint}
        </p>
      )}
      {multiline ? (
        <textarea
          {...sharedProps}
          rows={rows}
          ref={inputRef as Ref<HTMLTextAreaElement>}
        />
      ) : (
        <input
          {...sharedProps}
          type={type}
          ref={inputRef as Ref<HTMLInputElement>}
        />
      )}
    </div>
  )
}
