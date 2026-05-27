import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { safeEqual } from '@/lib/secrets'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const adminUsername = process.env.ADMIN_USERNAME
        const adminPassword = process.env.ADMIN_PASSWORD

        // Fail-CLOSED: no default creds. Tier 1 env vars per CLAUDE.md.
        if (!adminUsername || !adminPassword) {
          console.error('[auth] ADMIN_USERNAME or ADMIN_PASSWORD unset — admin login disabled')
          return null
        }

        // Timing-safe comparison via safeEqual (lib/secrets.ts).
        if (
          safeEqual(credentials?.username, adminUsername) &&
          safeEqual(credentials?.password, adminPassword)
        ) {
          return { id: '1', name: 'Admin', email: 'admin@alpacasibiza.com' }
        }
        return null
      },
    }),
  ],
  pages: {
    signIn: '/admin/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8h admin auto-logout (overrides NextAuth's 30-day default).
  },
  callbacks: {
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
      }
      return session
    },
  },
})
