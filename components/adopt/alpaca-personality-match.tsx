'use client'

/**
 * AlpacaPersonalityMatch — 3-question interactive quiz that recommends an
 * alpaca based on the donor's stated mood / energy / outdoor preference.
 *
 * Why: lowering the choice-paralysis of "which of 14 alpacas should I pick?"
 * for donors who don't have a preference but want a recommendation.
 *
 * How it works:
 *   1. Donor answers 3 multiple-choice questions (each answer is a vector
 *      of trait weights).
 *   2. We sum the vectors per trait and pick the alpaca whose personality
 *      string contains the highest-weight trait keywords.
 *   3. Recommendation card links to /adopt?alpaca=<slug>.
 *
 * Matching is heuristic — runs against the alpaca.personality string from
 * the content provider. When an alpaca has no personality (UNMAPPED), it is
 * not eligible. If zero alpacas match, we fall back to the first alpaca in
 * the roster so the quiz always recommends something.
 *
 * Pure client component, no API calls. Uses content provider data passed
 * in by the server.
 */

import { useState } from 'react'
import Link from 'next/link'
import type { Locale } from '@/i18n.config'
import type { AnimalEntity } from '@/lib/integrations/content-types'
import { t } from '@/lib/translations'

type Trait = 'calm' | 'playful' | 'shy' | 'bold' | 'sociable' | 'independent'

interface Answer {
  /** Human-readable label shown on the button. */
  label: string
  /** Weight added to each trait when this answer is picked. */
  weights: Partial<Record<Trait, number>>
}

interface Question {
  prompt: string
  answers: ReadonlyArray<Answer>
}

const QUESTIONS: ReadonlyArray<Question> = [
  {
    prompt: 'How would you describe your ideal evening?',
    answers: [
      { label: 'Quiet book and a candle', weights: { calm: 2, shy: 1, independent: 1 } },
      { label: 'Dinner party with friends', weights: { sociable: 2, playful: 1, bold: 1 } },
      { label: 'Hike to a sunset spot', weights: { bold: 2, independent: 1, calm: 1 } },
      { label: 'Game night with everyone', weights: { playful: 2, sociable: 2 } },
    ],
  },
  {
    prompt: 'Which farm moment sounds most appealing?',
    answers: [
      { label: 'Slow walk through the meadow', weights: { calm: 2, shy: 1 } },
      { label: 'Helping at feeding time', weights: { sociable: 2, bold: 1 } },
      { label: 'Watching the herd from a quiet bench', weights: { calm: 1, independent: 2 } },
      { label: 'Joining a group tour', weights: { playful: 2, sociable: 1 } },
    ],
  },
  {
    prompt: 'A friend describes you as…',
    answers: [
      { label: 'Thoughtful and grounded', weights: { calm: 2, independent: 1 } },
      { label: 'The life of the room', weights: { sociable: 2, playful: 2, bold: 1 } },
      { label: 'Quietly observant', weights: { shy: 2, calm: 1 } },
      { label: 'Always up for an adventure', weights: { bold: 2, playful: 1 } },
    ],
  },
] as const

const TRAIT_KEYWORDS: Record<Trait, ReadonlyArray<string>> = {
  calm: ['calm', 'gentle', 'quiet', 'peaceful', 'mellow', 'serene'],
  playful: ['playful', 'mischievous', 'cheeky', 'goofy', 'silly', 'fun'],
  shy: ['shy', 'reserved', 'soft', 'tentative'],
  bold: ['bold', 'confident', 'curious', 'brave', 'adventurous'],
  sociable: ['friendly', 'sociable', 'cuddly', 'warm', 'affectionate'],
  independent: ['independent', 'aloof', 'solo', 'thoughtful', 'observant'],
}

interface MatchProps {
  locale: Locale
  /** All available animals — quiz only matches against those with a personality string. */
  animals: ReadonlyArray<AnimalEntity>
  heading?: string
  intro?: string
}

export function AlpacaPersonalityMatch({ locale, animals, heading, intro }: MatchProps) {
  const translate = t(locale)
  const [step, setStep] = useState(0) // 0..QUESTIONS.length — last is the result
  const [weights, setWeights] = useState<Record<Trait, number>>({
    calm: 0, playful: 0, shy: 0, bold: 0, sociable: 0, independent: 0,
  })

  const headingText = heading ?? translate('adopt.match.heading', 'Find your alpaca match')
  const introText = intro ?? translate('adopt.match.intro', 'Three quick questions and we\'ll suggest one for you.')

  function handleAnswer(answer: Answer) {
    setWeights((prev) => {
      const next = { ...prev }
      for (const [trait, w] of Object.entries(answer.weights) as Array<[Trait, number]>) {
        next[trait] = (next[trait] ?? 0) + w
      }
      return next
    })
    setStep((s) => s + 1)
  }

  function reset() {
    setStep(0)
    setWeights({ calm: 0, playful: 0, shy: 0, bold: 0, sociable: 0, independent: 0 })
  }

  const showResult = step >= QUESTIONS.length

  // Compute match only at result step
  const match = showResult ? pickAlpaca(animals, weights) : null
  const totalAnswered = step
  const progressPct = Math.round((totalAnswered / (QUESTIONS.length + 1)) * 100)

  return (
    <section
      aria-labelledby="alpaca-match-heading"
      className="bg-card rounded-2xl border border-border p-6 sm:p-8"
    >
      <header className="text-center mb-6">
        <h2 id="alpaca-match-heading" className="text-2xl font-bold text-foreground mb-2">
          {headingText}
        </h2>
        <p className="text-sm text-foreground/70">{introText}</p>
      </header>

      {/* Progress */}
      <div
        className="w-full h-1 rounded-full bg-secondary/60 overflow-hidden mb-6"
        role="progressbar"
        aria-valuenow={progressPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={translate('adopt.match.progressAria', 'Quiz progress')}
      >
        <div
          className="h-full bg-primary transition-all duration-300 ease-out motion-reduce:transition-none"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {!showResult && (
        <div>
          <p className="text-sm font-medium text-foreground/60 mb-3">
            {translate('adopt.match.questionLabel', 'Question')} {step + 1} / {QUESTIONS.length}
          </p>
          <h3 className="text-lg font-semibold text-foreground mb-5">
            {QUESTIONS[step].prompt}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {QUESTIONS[step].answers.map((answer) => (
              <button
                key={answer.label}
                type="button"
                onClick={() => handleAnswer(answer)}
                className="text-left rounded-lg border border-border bg-card hover:border-primary/40 hover:bg-primary/5 px-4 py-3 text-sm font-medium text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                {answer.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {showResult && match && (
        <div className="text-center" aria-live="polite">
          <p className="text-sm font-medium text-foreground/60 mb-2">
            {translate('adopt.match.resultLabel', 'Your match')}
          </p>
          <p className="text-3xl font-bold text-primary mb-2">{match.name}</p>
          {match.personality && (
            <p className="text-sm italic text-foreground/70 mb-4">{match.personality}</p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
            <Link
              href={`/${locale}/adopt?alpaca=${encodeURIComponent(match.id)}`}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              {translate('alpacas.adoptCta', 'Adopt')} {match.name} →
            </Link>
            <Link
              href={`/${locale}/alpacas/${encodeURIComponent(match.id)}`}
              className="inline-flex items-center justify-center rounded-lg border border-primary px-6 py-3 text-sm font-semibold text-primary hover:bg-primary/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              {translate('adopt.match.learnMore', 'Read full bio')}
            </Link>
          </div>
          <button
            type="button"
            onClick={reset}
            className="mt-6 text-xs text-foreground/60 underline hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
          >
            {translate('adopt.match.retake', 'Try again')}
          </button>
        </div>
      )}

      {showResult && !match && (
        <p className="text-center text-sm text-foreground/70">
          {translate('adopt.match.noMatch', 'We couldn\'t find a match right now — try Pick for me on the adopt page.')}
        </p>
      )}
    </section>
  )
}

function pickAlpaca(
  animals: ReadonlyArray<AnimalEntity>,
  weights: Record<Trait, number>,
): AnimalEntity | null {
  const eligible = animals.filter((a) => a.personality && a.personality.length > 0)
  if (eligible.length === 0) return animals[0] ?? null

  // Score each alpaca by trait keyword presence weighted by donor's vector.
  let bestScore = -1
  let best: AnimalEntity | null = null
  for (const animal of eligible) {
    const personality = (animal.personality ?? '').toLowerCase()
    let score = 0
    for (const [trait, weight] of Object.entries(weights) as Array<[Trait, number]>) {
      const keywords = TRAIT_KEYWORDS[trait]
      for (const kw of keywords) {
        if (personality.includes(kw)) score += weight
      }
    }
    if (score > bestScore) {
      bestScore = score
      best = animal
    }
  }

  // No keyword overlap → fall back to first eligible alpaca rather than null
  // (the donor finished the quiz; we owe them a recommendation).
  return best ?? eligible[0]
}
