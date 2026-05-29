import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConsentNotice } from './consent-notice'
import { MarketingConsentCheckbox } from './marketing-consent-checkbox'

describe('ConsentNotice', () => {
  it('renders the action label inline', () => {
    render(<ConsentNotice locale="en" actionLabel="adopting" />)
    expect(screen.getByText('adopting')).toBeInTheDocument()
  })

  it('links Terms and Privacy to locale-prefixed paths', () => {
    render(<ConsentNotice locale="en" actionLabel="adopting" />)
    const terms = screen.getByRole('link', { name: /terms/i })
    const privacy = screen.getByRole('link', { name: /privacy/i })
    expect(terms).toHaveAttribute('href', '/en/terms')
    expect(privacy).toHaveAttribute('href', '/en/privacy')
  })

  it('opens legal links in a new tab safely', () => {
    render(<ConsentNotice locale="en" actionLabel="adopting" />)
    const terms = screen.getByRole('link', { name: /terms/i })
    expect(terms).toHaveAttribute('target', '_blank')
    expect(terms).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('respects locale prefix in link hrefs', () => {
    render(<ConsentNotice locale="de" actionLabel="adoptieren" />)
    expect(screen.getByRole('link', { name: /terms/i })).toHaveAttribute(
      'href',
      '/de/terms',
    )
    expect(screen.getByRole('link', { name: /privacy/i })).toHaveAttribute(
      'href',
      '/de/privacy',
    )
  })
})

describe('MarketingConsentCheckbox', () => {
  it('renders un-ticked by default (PECR compliance)', () => {
    render(
      <MarketingConsentCheckbox
        locale="en"
        checked={false}
        onChange={() => {}}
      />,
    )
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement
    expect(checkbox.checked).toBe(false)
  })

  it('sets aria-required when required=true (default)', () => {
    render(
      <MarketingConsentCheckbox
        locale="en"
        checked={false}
        onChange={() => {}}
      />,
    )
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-required', 'true')
  })

  it('omits aria-required when required=false', () => {
    render(
      <MarketingConsentCheckbox
        locale="en"
        checked={false}
        onChange={() => {}}
        required={false}
      />,
    )
    expect(screen.getByRole('checkbox')).not.toHaveAttribute('aria-required')
  })

  it('embeds a Privacy Policy link', () => {
    render(
      <MarketingConsentCheckbox
        locale="en"
        checked={false}
        onChange={() => {}}
      />,
    )
    const link = screen.getByRole('link', { name: /privacy/i })
    expect(link).toHaveAttribute('href', '/en/privacy')
  })

  it('reflects controlled checked prop', () => {
    render(
      <MarketingConsentCheckbox
        locale="en"
        checked={true}
        onChange={() => {}}
      />,
    )
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true)
  })
})
