import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FormField } from './form-field'

const noop = vi.fn()
const base = { id: 'email', label: 'Email', name: 'email', value: '', onChange: noop }

describe('FormField', () => {
  it('label htmlFor matches input id', () => {
    render(<FormField {...base} />)
    const label = screen.getByText('Email')
    expect(label).toHaveAttribute('for', 'email')
    expect(screen.getByRole('textbox')).toHaveAttribute('id', 'email')
  })

  it('sets aria-required when required=true', () => {
    render(<FormField {...base} required />)
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-required', 'true')
  })

  it('omits aria-required when required is false', () => {
    render(<FormField {...base} />)
    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-required')
  })

  it('sets aria-invalid when invalid=true', () => {
    render(<FormField {...base} invalid />)
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
  })

  it('omits aria-invalid when invalid=false (default)', () => {
    render(<FormField {...base} />)
    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-invalid')
  })

  it('aria-describedby includes hint id when hint provided', () => {
    render(<FormField {...base} hint="Must be valid" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'email-hint')
  })

  it('aria-describedby includes errorId when provided', () => {
    render(<FormField {...base} errorId="email-error" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'email-error')
  })

  it('aria-describedby composes hint + errorId when both provided', () => {
    render(<FormField {...base} hint="hint text" errorId="email-error" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'email-hint email-error')
  })

  it('renders textarea when multiline=true', () => {
    render(<FormField {...base} multiline />)
    expect(screen.getByRole('textbox').tagName).toBe('TEXTAREA')
  })

  it('renders input when multiline=false (default)', () => {
    render(<FormField {...base} />)
    expect(screen.getByRole('textbox').tagName).toBe('INPUT')
  })

  it('adds sr-only class to label when srOnly=true', () => {
    render(<FormField {...base} srOnly />)
    const label = screen.getByText('Email')
    expect(label).toHaveClass('sr-only')
  })

  it('label remains in a11y tree when srOnly=true', () => {
    render(<FormField {...base} srOnly />)
    expect(screen.getByText('Email')).toBeInTheDocument()
  })
})
