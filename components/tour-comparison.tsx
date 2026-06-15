'use client'

/**
 * TourComparison — side-by-side comparison table for the 4 core tour types.
 *
 * Desktop: 4-column sticky-header table (duration / price / capacity / best-for / includes / CTA).
 * Mobile: stacked cards, same data.
 *
 * All spec values arrive as props — NO values are hard-coded here.
 * Unmapped fields are rendered as-is ("Contact for details" fallback is set in the page).
 *
 * BookingButton is 'use client', so this component must also be a client component.
 */

import { BookingButton } from '@/components/booking/button'
import type { FareHarborProduct } from '@/lib/fareharbor-products'

export interface TourSpec {
  product: FareHarborProduct
  name: string
  /** e.g. '90 min' or 'Contact for details' */
  duration: string
  /** e.g. 'from €30 / person' or 'Contact for details' */
  price: string
  /** e.g. 'Up to 12 guests' or 'Contact for details' */
  capacity: string
  /** Bullet points rendered as a list */
  includes: string[]
  /** e.g. 'Families, first-time visitors' */
  bestFor: string
}

export interface TourComparisonProps {
  tours: TourSpec[]
  title?: string
  subtitle?: string
}

export function TourComparison({ tours, title, subtitle }: TourComparisonProps) {
  return (
    <section className="w-full py-16 md:py-24 px-4 bg-secondary/10" aria-label="Tour comparison">
      <div className="max-w-6xl mx-auto">
        {title && (
          <div className="text-center mb-4">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">{title}</h2>
          </div>
        )}
        {subtitle && (
          <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">{subtitle}</p>
        )}

        {/* ── Mobile: stacked cards ─────────────────────────────────────── */}
        <div className="md:hidden space-y-4">
          {tours.map((tour) => (
            <div
              key={tour.product}
              className="bg-card border border-border rounded-lg p-6 shadow-sm"
            >
              <h3 className="text-xl font-bold text-foreground mb-4">{tour.name}</h3>

              <dl className="space-y-2 text-sm mb-4">
                <div>
                  <dt className="font-semibold text-foreground inline">Duration: </dt>
                  <dd className="inline text-muted-foreground">{tour.duration}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-foreground inline">Price: </dt>
                  <dd className="inline text-muted-foreground">{tour.price}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-foreground inline">Capacity: </dt>
                  <dd className="inline text-muted-foreground">{tour.capacity}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-foreground inline">Best for: </dt>
                  <dd className="inline text-muted-foreground">{tour.bestFor}</dd>
                </div>
              </dl>

              <div className="text-sm mb-5">
                <span className="font-semibold text-foreground">Includes:</span>
                <ul className="list-disc list-inside mt-1 text-muted-foreground space-y-0.5">
                  {tour.includes.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <BookingButton
                product={tour.product}
                label={`Book — ${tour.name}`}
                className="w-full"
              />
            </div>
          ))}
        </div>

        {/* ── Desktop: side-by-side table ──────────────────────────────── */}
        <div className="hidden md:block overflow-x-auto rounded-lg border border-border shadow-sm">
          <table className="w-full border-collapse bg-card" role="table">
            <thead>
              <tr className="bg-secondary/30">
                {/* empty corner cell */}
                <th
                  scope="col"
                  className="text-left p-4 border-b border-border w-36 sticky left-0 bg-secondary/30 z-10"
                  aria-label="Feature"
                />
                {tours.map((tour) => (
                  <th
                    key={tour.product}
                    scope="col"
                    className="text-left p-4 border-b border-border min-w-[200px] font-bold text-lg text-foreground"
                  >
                    {tour.name}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {/* Duration */}
              <tr className="even:bg-secondary/10">
                <th
                  scope="row"
                  className="text-left p-4 border-b border-border font-semibold text-foreground sticky left-0 bg-card even:bg-secondary/10 z-10 text-sm"
                >
                  Duration
                </th>
                {tours.map((tour) => (
                  <td
                    key={tour.product}
                    className="p-4 border-b border-border text-muted-foreground text-sm"
                  >
                    {tour.duration}
                  </td>
                ))}
              </tr>

              {/* Price */}
              <tr className="even:bg-secondary/10">
                <th
                  scope="row"
                  className="text-left p-4 border-b border-border font-semibold text-foreground sticky left-0 bg-card z-10 text-sm"
                >
                  Price
                </th>
                {tours.map((tour) => (
                  <td
                    key={tour.product}
                    className="p-4 border-b border-border text-muted-foreground text-sm"
                  >
                    {tour.price}
                  </td>
                ))}
              </tr>

              {/* Capacity */}
              <tr className="even:bg-secondary/10">
                <th
                  scope="row"
                  className="text-left p-4 border-b border-border font-semibold text-foreground sticky left-0 bg-card even:bg-secondary/10 z-10 text-sm"
                >
                  Capacity
                </th>
                {tours.map((tour) => (
                  <td
                    key={tour.product}
                    className="p-4 border-b border-border text-muted-foreground text-sm"
                  >
                    {tour.capacity}
                  </td>
                ))}
              </tr>

              {/* Best for */}
              <tr className="even:bg-secondary/10">
                <th
                  scope="row"
                  className="text-left p-4 border-b border-border font-semibold text-foreground sticky left-0 bg-card z-10 text-sm"
                >
                  Best for
                </th>
                {tours.map((tour) => (
                  <td
                    key={tour.product}
                    className="p-4 border-b border-border text-muted-foreground text-sm"
                  >
                    {tour.bestFor}
                  </td>
                ))}
              </tr>

              {/* Includes */}
              <tr className="even:bg-secondary/10">
                <th
                  scope="row"
                  className="text-left p-4 border-b border-border font-semibold text-foreground sticky left-0 bg-card even:bg-secondary/10 z-10 align-top text-sm"
                >
                  Includes
                </th>
                {tours.map((tour) => (
                  <td
                    key={tour.product}
                    className="p-4 border-b border-border text-muted-foreground align-top text-sm"
                  >
                    <ul className="list-disc list-inside space-y-0.5">
                      {tour.includes.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </td>
                ))}
              </tr>

              {/* CTA row */}
              <tr>
                <th
                  scope="row"
                  className="text-left p-4 sticky left-0 bg-card z-10"
                  aria-label="Book"
                />
                {tours.map((tour) => (
                  <td key={tour.product} className="p-4 align-top">
                    <BookingButton
                      product={tour.product}
                      label="Book now"
                      className="w-full"
                    />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
