'use client'

interface HoneypotProps {
  /** Hidden field name. Use generic name like "company_url" — bots target named fields. */
  readonly name?: string
  /** Controlled value + setter so the parent can read the value at submit time. */
  readonly value: string
  readonly onChange: (v: string) => void
}

export function HoneypotField({ name = 'company_url', value, onChange }: HoneypotProps) {
  return (
    <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-0 w-0 overflow-hidden" tabIndex={-1}>
      <label htmlFor={`__hp_${name}`}>Leave this field empty</label>
      <input
        id={`__hp_${name}`}
        name={name}
        type="text"
        autoComplete="off"
        tabIndex={-1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
