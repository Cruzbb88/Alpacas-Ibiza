import type { Metadata } from 'next'

// Admin route segment — noindex applied here covers /admin/login (which is 'use client'
// and cannot export metadata directly) as well as any future /admin/* pages.
// The analytics page exports its own identical robots metadata for belt-and-suspenders.
export const metadata: Metadata = {
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
  // Admin-scoped PWA manifest — owner taps "Add to Home Screen" on /admin to get
  // a standalone install named "Alpacas Admin" separate from the consumer PWA.
  manifest: '/admin/manifest.webmanifest',
  // iOS standalone-mode hints (Safari ignores manifest display:standalone without these)
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Alpacas Admin',
  },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
