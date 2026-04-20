/**
 * Persistence for scheduled email IDs tied to FareHarbor bookings.
 *
 * Used so that when a booking is updated/cancelled, we can look up the
 * previously-scheduled Resend email IDs and cancel them before re-scheduling.
 *
 * Current impl is in-memory (lost on cold start) — acceptable for MVP because:
 * - Most bookings are created and fulfilled without changes
 * - A missed cancellation just means one stale email — annoying, not breaking
 *
 * Upgrade paths (pick when volume demands it):
 * 1. Vercel KV (recommended — Upstash Redis backed, zero-config if on Vercel)
 * 2. Supabase table (if a DB is already in use)
 * 3. Cloudflare KV (if moving off Vercel)
 *
 * The interface below is intentionally small so swapping the backing store is
 * a single-file change.
 */

export interface ScheduledBookingEmails {
    bookingPk: string | number
    reminderEmailId?: string | null
    reviewEmailId?: string | null
    startAt?: string // ISO 8601
    customerEmail?: string
}

export interface BookingScheduleStore {
    get(bookingPk: string | number): Promise<ScheduledBookingEmails | null>
    set(record: ScheduledBookingEmails): Promise<void>
    delete(bookingPk: string | number): Promise<void>
}

// In-memory implementation — process-scoped, lost on cold start / redeploy.
class MemoryStore implements BookingScheduleStore {
    private map = new Map<string, ScheduledBookingEmails>()

    async get(pk: string | number) {
        return this.map.get(String(pk)) ?? null
    }
    async set(record: ScheduledBookingEmails) {
        this.map.set(String(record.bookingPk), record)
    }
    async delete(pk: string | number) {
        this.map.delete(String(pk))
    }
}

// Singleton — global so it survives HMR in dev
const globalForStore = globalThis as unknown as {
    __bookingScheduleStore?: BookingScheduleStore
}

export const bookingScheduleStore: BookingScheduleStore =
    globalForStore.__bookingScheduleStore ?? new MemoryStore()

if (process.env.NODE_ENV !== 'production') {
    globalForStore.__bookingScheduleStore = bookingScheduleStore
}
