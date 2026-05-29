/**
 * Shared inline styles for admin analytics pages.
 *
 * Extracted from app/admin/analytics/{vat,dunning,subscriptions}/page.tsx
 * where the same `th`, `td`, and KPI card CSS shapes had drifted into
 * three slightly-different copies. Consolidating prevents future drift and
 * documents these as the canonical admin table look.
 *
 * No CSS framework on this surface — admin pages render server-side with
 * inline styles only (next.js App Router + RSC). That keeps the admin
 * surface independent of the marketing-site theme system.
 */
import type { CSSProperties } from 'react'

export const adminTh: CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  borderBottom: '1px solid #e5e7eb',
  fontWeight: 600,
  color: '#374151',
}

export const adminTd: CSSProperties = {
  padding: '10px 12px',
  borderBottom: '1px solid #f3f4f6',
  color: '#111827',
}
