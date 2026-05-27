import type { Metadata } from 'next'

// Admin route segment — noindex applied here covers /admin/login (which is 'use client'
// and cannot export metadata directly) as well as any future /admin/* pages.
// The analytics page exports its own identical robots metadata for belt-and-suspenders.
export const metadata: Metadata = {
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
