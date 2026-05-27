import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AlpacaCard } from './alpaca-card'
import type { AnimalEntity } from '@/lib/integrations/content-types'

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; sizes?: string }) => {
    const { fill: _f, sizes: _s, ...rest } = props
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...rest} />
  },
}))

vi.mock('@/lib/translations', () => ({
  t: (_locale: string) => (key: string) => key,
}))

const base: AnimalEntity = {
  kind: 'animal',
  id: 'fluffy',
  name: 'Fluffy',
  bio: null,
  image: null,
}

describe('AlpacaCard', () => {
  it('renders alpaca name', () => {
    render(<AlpacaCard alpaca={base} locale="en" />)
    expect(screen.getAllByText('Fluffy').length).toBeGreaterThan(0)
  })

  it('renders image placeholder when image is null', () => {
    render(<AlpacaCard alpaca={base} locale="en" />)
    expect(screen.queryByRole('img', { name: 'Fluffy' })).not.toBeInTheDocument()
    // placeholder div has aria-label from translate key
    expect(screen.getByLabelText(/Fluffy/)).toBeInTheDocument()
  })

  it('renders img element when image is provided', () => {
    render(<AlpacaCard alpaca={{ ...base, image: '/fluffy.jpg' }} locale="en" />)
    expect(screen.getByRole('img', { name: 'Fluffy' })).toBeInTheDocument()
  })

  it('omits breed/age badge when both are null', () => {
    render(<AlpacaCard alpaca={{ ...base, breed: null, age: null }} locale="en" />)
    // badge paragraph only renders when hasBadge is true
    expect(screen.queryByText(/Huacaya/)).not.toBeInTheDocument()
  })

  it('renders breed when provided', () => {
    render(<AlpacaCard alpaca={{ ...base, breed: 'Huacaya' }} locale="en" />)
    expect(screen.getByText(/Huacaya/)).toBeInTheDocument()
  })

  it('omits personality when null', () => {
    render(<AlpacaCard alpaca={{ ...base, personality: null }} locale="en" />)
    // no italic personality text
    expect(screen.queryByText(/friendly/i)).not.toBeInTheDocument()
  })

  it('renders personality when provided', () => {
    render(<AlpacaCard alpaca={{ ...base, personality: 'Very friendly' }} locale="en" />)
    expect(screen.getByText('Very friendly')).toBeInTheDocument()
  })

  it('uses locale-specific bio from localizedBio map', () => {
    render(<AlpacaCard alpaca={{ ...base, localizedBio: { en: 'English bio', nl: 'Dutch bio' } }} locale="nl" />)
    expect(screen.getByText('Dutch bio')).toBeInTheDocument()
  })

  it('falls back to en bio when locale key missing', () => {
    render(<AlpacaCard alpaca={{ ...base, localizedBio: { en: 'English bio' } }} locale="de" />)
    expect(screen.getByText('English bio')).toBeInTheDocument()
  })

  it('falls back to translate key when localizedBio is null and bio is null', () => {
    render(<AlpacaCard alpaca={{ ...base, localizedBio: null, bio: null }} locale="en" />)
    expect(screen.getByText('alpacas.bioComingSoon')).toBeInTheDocument()
  })

  it('uses plain bio string when localizedBio is absent', () => {
    render(<AlpacaCard alpaca={{ ...base, bio: 'Plain bio text' }} locale="en" />)
    expect(screen.getByText('Plain bio text')).toBeInTheDocument()
  })

  it('omits fun_fact when null', () => {
    render(<AlpacaCard alpaca={{ ...base, fun_fact: null }} locale="en" />)
    expect(screen.queryByText(/✦/)).not.toBeInTheDocument()
  })
})
