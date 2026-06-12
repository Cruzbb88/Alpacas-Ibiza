'use client'

/**
 * AdminSignOutButton — calls next-auth signOut and redirects to /admin/login.
 * Client component because signOut is a next-auth client-side method.
 * Mounted in /admin (the index page) so the admin always has a clear exit.
 */

import { signOut } from 'next-auth/react'

export function AdminSignOutButton() {
  return (
    <button
      type="button"
      onClick={() => { signOut({ callbackUrl: '/admin/login' }).catch(() => { window.location.href = '/admin/login' }) }}
      className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/40 transition-colors whitespace-nowrap"
    >
      Sign out
    </button>
  )
}
