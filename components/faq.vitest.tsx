import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FAQ } from './faq'

const items = [
  { question: 'What time does it open?', answer: 'From 9am to 5pm.' },
  { question: 'Do you allow dogs?', answer: 'Sorry, no pets.' },
]

describe('FAQ', () => {
  it('renders all question buttons', () => {
    render(<FAQ items={items} />)
    expect(screen.getByText('What time does it open?')).toBeInTheDocument()
    expect(screen.getByText('Do you allow dogs?')).toBeInTheDocument()
  })

  it('answers are hidden initially', () => {
    render(<FAQ items={items} />)
    expect(screen.queryByText('From 9am to 5pm.')).not.toBeInTheDocument()
  })

  it('shows answer when question is clicked', async () => {
    const user = userEvent.setup()
    render(<FAQ items={items} />)
    await user.click(screen.getByText('What time does it open?'))
    expect(screen.getByText('From 9am to 5pm.')).toBeInTheDocument()
  })

  it('collapses open item when clicked again (toggle)', async () => {
    const user = userEvent.setup()
    render(<FAQ items={items} />)
    const btn = screen.getByText('What time does it open?')
    await user.click(btn)
    await user.click(btn)
    expect(screen.queryByText('From 9am to 5pm.')).not.toBeInTheDocument()
  })

  it('only one item open at a time (single mode)', async () => {
    const user = userEvent.setup()
    render(<FAQ items={items} />)
    await user.click(screen.getByText('What time does it open?'))
    await user.click(screen.getByText('Do you allow dogs?'))
    expect(screen.queryByText('From 9am to 5pm.')).not.toBeInTheDocument()
    expect(screen.getByText('Sorry, no pets.')).toBeInTheDocument()
  })

  it('renders custom title when provided', () => {
    render(<FAQ items={items} title="Custom FAQ Title" />)
    expect(screen.getByRole('heading', { name: 'Custom FAQ Title' })).toBeInTheDocument()
  })

  it('renders default title when title omitted', () => {
    render(<FAQ items={[]} />)
    expect(screen.getByRole('heading', { name: 'Frequently Asked Questions' })).toBeInTheDocument()
  })

  it('renders empty list without crashing', () => {
    const { container } = render(<FAQ items={[]} />)
    expect(container).toBeTruthy()
  })
})
