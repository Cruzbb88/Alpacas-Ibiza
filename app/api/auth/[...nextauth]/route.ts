import NextAuth, { type NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { safeEqual } from '@/lib/secrets'

/**
 * NextAuth v4 (package.json pins ^4.24.13). v4 returns a single handler from
 * NextAuth(authOptions); we re-export it as GET + POST per the App Router
 * convention. Do NOT switch to `const { handlers } = NextAuth(...)` — that is
 * v5-only and breaks at build with "Cannot read properties of undefined
 * (reading 'GET')".
 */
export const authOptions: NextAuthOptions = {
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
      if (token && session.user) {
        ;(session.user as { id?: string }).id = token.sub
      }
      return session
    },
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }

// `auth` is the legacy import name used by admin/* pages + /api/analytics/data:
//   const session = await getServerSession(auth)
// In NextAuth v4, getServerSession takes the authOptions object — so this
// alias is just `authOptions` under a more readable name. Keep both exports
// so existing callers compile without churn.
export { authOptions as auth }
