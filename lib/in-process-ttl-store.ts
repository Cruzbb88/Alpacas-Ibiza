/**
 * Minimal in-process TTL-keyed Map. Lazy purge: removes expired entries on
 * every has/set/purge call. No cap by design — callers concerned with
 * unbounded growth should pair this with a maxEntries cap externally.
 *
 * Each store binds a unique `globalThis` key so HMR / module re-eval don't
 * fragment state into multiple Maps.
 */
export interface TtlStore {
  has(key: string): boolean
  set(key: string, now?: number): void
  purge(now?: number): void
  clear(): void
  size(): number // post-purge size — for tests + monitoring
}

export function createTtlStore(opts: { ttlMs: number; globalKey: string }): TtlStore {
  const { ttlMs, globalKey } = opts

  const g = globalThis as unknown as Record<string, Map<string, number> | undefined>
  const store: Map<string, number> = g[globalKey] ?? new Map()
  if (process.env.NODE_ENV !== 'production') {
    g[globalKey] = store
  }

  // amortised O(1), at most one full sweep per minute; expired entries may linger
  // up to 60s past TTL but never affect correctness as `has()` does a per-key freshness check.
  let lastPurgeMs = 0

  function _purge(now: number): void {
    for (const [k, ts] of store) {
      if (now - ts > ttlMs) store.delete(k)
    }
  }

  function maybePurge(now: number): void {
    if (now - lastPurgeMs > 60_000) {
      _purge(now)
      lastPurgeMs = now
    }
  }

  return {
    has(key: string): boolean {
      const now = Date.now()
      maybePurge(now)
      const ts = store.get(key)
      if (ts === undefined) return false
      if (now - ts > ttlMs) { store.delete(key); return false }
      return true
    },

    set(key: string, now?: number): void {
      const ts = now ?? Date.now()
      maybePurge(ts)
      store.set(key, ts)
    },

    purge(now?: number): void {
      const n = now ?? Date.now()
      _purge(n)
      lastPurgeMs = n
    },

    clear(): void {
      store.clear()
    },

    size(): number {
      _purge(Date.now())
      return store.size
    },
  }
}

/**
 * Value-carrying sibling of {@link createTtlStore}. Same lazy-purge + globalThis-key
 * semantics, but each key maps to a typed value `V` (not just a presence timestamp).
 * Consolidates the hand-rolled `Map<string, {value, at|expiresAt}>` + TTL-check +
 * globalThis pattern duplicated across several read-through caches
 * (adopters/count, referral-count-reader, …). See uft-002 (2026-06-10).
 */
export interface TtlValueStore<V> {
  get(key: string): V | undefined
  set(key: string, value: V, now?: number): void
  delete(key: string): void
  /** Non-expired entries as [key, value] pairs (insertion order). For callers that
   *  must enumerate (e.g. an admin list view). Triggers a purge first. */
  entries(): Array<[string, V]>
  purge(now?: number): void
  clear(): void
  size(): number
}

export function createTtlValueStore<V>(opts: {
  ttlMs: number
  globalKey: string
  /** Optional hard cap. When exceeded after a set, the oldest entry (smallest ts)
   *  is evicted until size ≤ maxSize. Omit for unbounded (the default). */
  maxSize?: number
}): TtlValueStore<V> {
  const { ttlMs, globalKey, maxSize } = opts
  type Entry = { v: V; ts: number }

  const g = globalThis as unknown as Record<string, Map<string, Entry> | undefined>
  const store: Map<string, Entry> = g[globalKey] ?? new Map()
  if (process.env.NODE_ENV !== 'production') {
    g[globalKey] = store
  }

  let lastPurgeMs = 0

  function _purge(now: number): void {
    for (const [k, e] of store) {
      if (now - e.ts > ttlMs) store.delete(k)
    }
  }

  function maybePurge(now: number): void {
    if (now - lastPurgeMs > 60_000) {
      _purge(now)
      lastPurgeMs = now
    }
  }

  return {
    get(key: string): V | undefined {
      const now = Date.now()
      maybePurge(now)
      const e = store.get(key)
      if (e === undefined) return undefined
      if (now - e.ts > ttlMs) {
        store.delete(key)
        return undefined
      }
      return e.v
    },

    set(key: string, value: V, now?: number): void {
      const ts = now ?? Date.now()
      maybePurge(ts)
      store.set(key, { v: value, ts })
      // Hard-cap eviction: drop the oldest (smallest-ts) entries until within cap.
      // Runs only when a cap is set and exceeded — i.e. essentially never for the
      // rare-event stores that use it. Never evicts the key just written (largest ts).
      if (maxSize !== undefined) {
        while (store.size > maxSize) {
          let oldestKey: string | undefined
          let oldestTs = Infinity
          for (const [k, e] of store) {
            if (e.ts < oldestTs) {
              oldestTs = e.ts
              oldestKey = k
            }
          }
          if (oldestKey === undefined) break
          store.delete(oldestKey)
        }
      }
    },

    delete(key: string): void {
      store.delete(key)
    },

    entries(): Array<[string, V]> {
      const now = Date.now()
      maybePurge(now)
      const out: Array<[string, V]> = []
      for (const [k, e] of store) {
        if (now - e.ts <= ttlMs) out.push([k, e.v])
      }
      return out
    },

    purge(now?: number): void {
      const n = now ?? Date.now()
      _purge(n)
      lastPurgeMs = n
    },

    clear(): void {
      store.clear()
    },

    size(): number {
      _purge(Date.now())
      return store.size
    },
  }
}
