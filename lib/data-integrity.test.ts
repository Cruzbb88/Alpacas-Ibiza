/**
 * Data-integrity tests for lib/data/*.ts
 *
 * These tests validate STRUCTURAL INVARIANTS only — no freshness checks,
 * no rendering, no production-server calls.
 *
 * Framework: node --test --experimental-strip-types (matches pnpm test script).
 *
 * Failsafe pattern: each describe block skips gracefully when the data array
 * is empty or a required export is missing, rather than failing the suite.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { ALPACAS } from './data/alpacas.ts'
import { testimonials } from './data/testimonials.ts'
import { press } from './data/press.ts'
import {
  JOURNAL_POSTS,
  listJournalPostsNewest,
  findJournalPostBySlug,
  listAllJournalTags,
} from './data/journal-posts.ts'

// ─────────────────────────────────────────────────────────────────────────────
// lib/data/alpacas.ts
// ─────────────────────────────────────────────────────────────────────────────

describe('lib/data/alpacas.ts', () => {
  it('has exactly 14 entries (verified live count)', () => {
    assert.equal(ALPACAS.length, 14)
  })

  it('every entry has a non-empty name', () => {
    for (const alpaca of ALPACAS) {
      assert.ok(
        typeof alpaca.name === 'string' && alpaca.name.trim().length > 0,
        `alpaca id="${alpaca.id}" has empty or missing name`,
      )
    }
  })

  it('every entry has a non-empty id', () => {
    for (const alpaca of ALPACAS) {
      assert.ok(
        typeof alpaca.id === 'string' && alpaca.id.trim().length > 0,
        `alpaca name="${alpaca.name}" has empty or missing id`,
      )
    }
  })

  it('all ids are unique', () => {
    const ids = ALPACAS.map((a) => a.id)
    const unique = new Set(ids)
    assert.equal(unique.size, ids.length, `duplicate ids found: ${ids.filter((id, i) => ids.indexOf(id) !== i).join(', ')}`)
  })

  it('every entry has bio: null (UNMAPPED contract)', () => {
    for (const alpaca of ALPACAS) {
      assert.equal(alpaca.bio, null, `alpaca id="${alpaca.id}" has non-null bio — UNMAPPED contract violated`)
    }
  })

  it('every entry has image: null (UNMAPPED contract)', () => {
    for (const alpaca of ALPACAS) {
      assert.equal(alpaca.image, null, `alpaca id="${alpaca.id}" has non-null image — UNMAPPED contract violated`)
    }
  })

  it('no two entries share the same name (case-insensitive)', () => {
    const names = ALPACAS.map((a) => a.name.toLowerCase())
    const unique = new Set(names)
    assert.equal(
      unique.size,
      names.length,
      `duplicate names found: ${names.filter((n, i) => names.indexOf(n) !== i).join(', ')}`,
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// lib/data/testimonials.ts
// ─────────────────────────────────────────────────────────────────────────────

describe('lib/data/testimonials.ts', () => {
  const SUPPORTED_LOCALES = ['en', 'nl', 'de', 'es', 'fr', 'it'] as const
  const VALID_SOURCES = ['facebook', 'google', 'tripadvisor'] as const
  const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

  if (testimonials.length === 0) {
    it.skip('testimonials array is empty — all tests skipped')
    return
  }

  it('all entries have non-empty id', () => {
    for (const t of testimonials) {
      assert.ok(
        typeof t.id === 'string' && t.id.trim().length > 0,
        `testimonial name="${t.name}" has empty or missing id`,
      )
    }
  })

  it('all entries have non-empty name', () => {
    for (const t of testimonials) {
      assert.ok(
        typeof t.name === 'string' && t.name.trim().length > 0,
        `testimonial id="${t.id}" has empty or missing name`,
      )
    }
  })

  it('all entries have non-empty body', () => {
    for (const t of testimonials) {
      assert.ok(
        typeof t.body === 'string' && t.body.trim().length > 0,
        `testimonial id="${t.id}" has empty or missing body`,
      )
    }
  })

  it('all ids are unique', () => {
    const ids = testimonials.map((t) => t.id)
    const unique = new Set(ids)
    assert.equal(
      unique.size,
      ids.length,
      `duplicate ids: ${ids.filter((id, i) => ids.indexOf(id) !== i).join(', ')}`,
    )
  })

  it('locale is one of the supported locales when present', () => {
    for (const t of testimonials) {
      if (t.locale !== undefined) {
        assert.ok(
          (SUPPORTED_LOCALES as ReadonlyArray<string>).includes(t.locale),
          `testimonial id="${t.id}" has unsupported locale="${t.locale}"`,
        )
      }
    }
  })

  it('rating is null OR between 1 and 5 inclusive (type-enforced)', () => {
    for (const t of testimonials) {
      if (t.rating !== null) {
        assert.ok(
          typeof t.rating === 'number' && t.rating >= 1 && t.rating <= 5,
          `testimonial id="${t.id}" has rating=${t.rating} outside 1–5`,
        )
      }
    }
  })

  it('date is null OR matches YYYY-MM-DD pattern', () => {
    for (const t of testimonials) {
      if (t.date !== null) {
        assert.ok(
          ISO_DATE_RE.test(t.date),
          `testimonial id="${t.id}" has malformed date="${t.date}"`,
        )
      }
    }
  })

  it('body is at least 50 characters (prevents accidental truncation)', () => {
    for (const t of testimonials) {
      assert.ok(
        t.body.length >= 50,
        `testimonial id="${t.id}" body is only ${t.body.length} chars (< 50)`,
      )
    }
  })

  it('body is at most 1500 characters (prevents copy-paste overflow)', () => {
    for (const t of testimonials) {
      assert.ok(
        t.body.length <= 1500,
        `testimonial id="${t.id}" body is ${t.body.length} chars (> 1500)`,
      )
    }
  })

  it('source is from the known set when present', () => {
    for (const t of testimonials) {
      if (t.source !== undefined) {
        assert.ok(
          (VALID_SOURCES as ReadonlyArray<string>).includes(t.source),
          `testimonial id="${t.id}" has unsupported source="${t.source}"`,
        )
      }
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// lib/data/press.ts
// ─────────────────────────────────────────────────────────────────────────────

describe('lib/data/press.ts', () => {
  const HTTPS_URL_RE = /^https:\/\/.+/
  const VALID_STATUSES = ['pending', 'live'] as const

  if (press.length === 0) {
    it.skip('press array is empty — all tests skipped')
    return
  }

  it('every entry has a non-empty id', () => {
    for (const p of press) {
      assert.ok(
        typeof p.id === 'string' && p.id.trim().length > 0,
        `press outlet="${p.outlet}" has empty or missing id`,
      )
    }
  })

  it('every entry has a non-empty outlet', () => {
    for (const p of press) {
      assert.ok(
        typeof p.outlet === 'string' && p.outlet.trim().length > 0,
        `press id="${p.id}" has empty or missing outlet`,
      )
    }
  })

  it('all ids are unique', () => {
    const ids = press.map((p) => p.id)
    const unique = new Set(ids)
    assert.equal(
      unique.size,
      ids.length,
      `duplicate press ids: ${ids.filter((id, i) => ids.indexOf(id) !== i).join(', ')}`,
    )
  })

  it('logoUrl is null OR matches HTTPS URL pattern', () => {
    for (const p of press) {
      if (p.logoUrl !== null) {
        assert.ok(
          HTTPS_URL_RE.test(p.logoUrl),
          `press id="${p.id}" logoUrl="${p.logoUrl}" is not a valid HTTPS URL`,
        )
      }
    }
  })

  it('articleUrl is null OR matches HTTPS URL pattern', () => {
    for (const p of press) {
      if (p.articleUrl !== null) {
        assert.ok(
          HTTPS_URL_RE.test(p.articleUrl),
          `press id="${p.id}" articleUrl="${p.articleUrl}" is not a valid HTTPS URL`,
        )
      }
    }
  })

  it('status is one of pending | live', () => {
    for (const p of press) {
      assert.ok(
        (VALID_STATUSES as ReadonlyArray<string>).includes(p.status),
        `press id="${p.id}" has invalid status="${p.status}"`,
      )
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// lib/data/journal-posts.ts
// ─────────────────────────────────────────────────────────────────────────────

describe('lib/data/journal-posts.ts', () => {
  const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T.*)?$/
  const KEBAB_CASE_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
  const SUPPORTED_LOCALES = ['en', 'nl', 'de', 'es', 'fr', 'it'] as const

  if (JOURNAL_POSTS.length === 0) {
    it.skip('JOURNAL_POSTS array is empty — structural tests skipped')
  } else {
    it('every entry has a non-empty slug', () => {
      for (const post of JOURNAL_POSTS) {
        assert.ok(
          typeof post.slug === 'string' && post.slug.trim().length > 0,
          `post title="${post.title}" has empty or missing slug`,
        )
      }
    })

    it('every entry has a non-empty title', () => {
      for (const post of JOURNAL_POSTS) {
        assert.ok(
          typeof post.title === 'string' && post.title.trim().length > 0,
          `post slug="${post.slug}" has empty or missing title`,
        )
      }
    })

    it('every entry has a non-empty excerpt', () => {
      for (const post of JOURNAL_POSTS) {
        assert.ok(
          typeof post.excerpt === 'string' && post.excerpt.trim().length > 0,
          `post slug="${post.slug}" has empty or missing excerpt`,
        )
      }
    })

    it('every entry has a non-empty body', () => {
      for (const post of JOURNAL_POSTS) {
        assert.ok(
          typeof post.body === 'string' && post.body.trim().length > 0,
          `post slug="${post.slug}" has empty or missing body`,
        )
      }
    })

    it('every entry has a non-empty publishedAt', () => {
      for (const post of JOURNAL_POSTS) {
        assert.ok(
          typeof post.publishedAt === 'string' && post.publishedAt.trim().length > 0,
          `post slug="${post.slug}" has empty or missing publishedAt`,
        )
      }
    })

    it('every entry has a non-empty author name', () => {
      for (const post of JOURNAL_POSTS) {
        assert.ok(
          typeof post.author?.name === 'string' && post.author.name.trim().length > 0,
          `post slug="${post.slug}" has empty or missing author.name`,
        )
      }
    })

    it('all slugs are unique', () => {
      const slugs = [...JOURNAL_POSTS].map((p) => p.slug)
      const unique = new Set(slugs)
      assert.equal(
        unique.size,
        slugs.length,
        `duplicate slugs: ${slugs.filter((s, i) => slugs.indexOf(s) !== i).join(', ')}`,
      )
    })

    it('slug matches kebab-case pattern', () => {
      for (const post of JOURNAL_POSTS) {
        assert.ok(
          KEBAB_CASE_RE.test(post.slug),
          `post slug="${post.slug}" does not match kebab-case pattern`,
        )
      }
    })

    it('publishedAt is a valid ISO date', () => {
      for (const post of JOURNAL_POSTS) {
        assert.ok(
          ISO_DATE_RE.test(post.publishedAt),
          `post slug="${post.slug}" has malformed publishedAt="${post.publishedAt}"`,
        )
      }
    })

    it('updatedAt is null OR a valid ISO date AND >= publishedAt', () => {
      for (const post of JOURNAL_POSTS) {
        if (post.updatedAt !== null) {
          assert.ok(
            ISO_DATE_RE.test(post.updatedAt),
            `post slug="${post.slug}" has malformed updatedAt="${post.updatedAt}"`,
          )
          assert.ok(
            post.updatedAt >= post.publishedAt,
            `post slug="${post.slug}" updatedAt="${post.updatedAt}" is before publishedAt="${post.publishedAt}"`,
          )
        }
      }
    })

    it('readingMinutes is > 0 and < 60', () => {
      for (const post of JOURNAL_POSTS) {
        assert.ok(
          post.readingMinutes > 0 && post.readingMinutes < 60,
          `post slug="${post.slug}" has readingMinutes=${post.readingMinutes} outside (0, 60)`,
        )
      }
    })

    it('tags is a non-empty array of non-empty strings', () => {
      for (const post of JOURNAL_POSTS) {
        assert.ok(
          Array.isArray(post.tags) && post.tags.length > 0,
          `post slug="${post.slug}" has empty or missing tags array`,
        )
        for (const tag of post.tags) {
          assert.ok(
            typeof tag === 'string' && tag.trim().length > 0,
            `post slug="${post.slug}" has an empty tag`,
          )
        }
      }
    })

    it('locale is one of the supported locales', () => {
      for (const post of JOURNAL_POSTS) {
        assert.ok(
          (SUPPORTED_LOCALES as ReadonlyArray<string>).includes(post.locale),
          `post slug="${post.slug}" has unsupported locale="${post.locale}"`,
        )
      }
    })

    it('excerpt length is <= 280 chars', () => {
      for (const post of JOURNAL_POSTS) {
        assert.ok(
          post.excerpt.length <= 280,
          `post slug="${post.slug}" excerpt is ${post.excerpt.length} chars (> 280)`,
        )
      }
    })

    it('body length is >= 200 chars (not accidentally empty)', () => {
      for (const post of JOURNAL_POSTS) {
        assert.ok(
          post.body.length >= 200,
          `post slug="${post.slug}" body is only ${post.body.length} chars (< 200)`,
        )
      }
    })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// helper functions from lib/data/journal-posts.ts
// ─────────────────────────────────────────────────────────────────────────────

describe('lib/data/journal-posts.ts — helper functions', () => {
  if (JOURNAL_POSTS.length === 0) {
    it.skip('JOURNAL_POSTS array is empty — helper tests skipped')
    return
  }

  it('listJournalPostsNewest() returns posts in descending publishedAt order', () => {
    const sorted = listJournalPostsNewest()
    assert.equal(sorted.length, JOURNAL_POSTS.length)
    for (let i = 1; i < sorted.length; i++) {
      assert.ok(
        sorted[i - 1].publishedAt >= sorted[i].publishedAt,
        `posts at index ${i - 1} ("${sorted[i - 1].slug}") and ${i} ("${sorted[i].slug}") are out of order`,
      )
    }
  })

  it('findJournalPostBySlug returns the post for the first known slug', () => {
    const firstSlug = JOURNAL_POSTS[0].slug
    const found = findJournalPostBySlug(firstSlug)
    assert.ok(found !== null, `findJournalPostBySlug("${firstSlug}") returned null`)
    assert.equal(found.slug, firstSlug)
  })

  it('findJournalPostBySlug returns null for a nonexistent slug', () => {
    const result = findJournalPostBySlug('nonexistent-slug-that-will-never-exist-xyzzy')
    assert.equal(result, null)
  })

  it('listAllJournalTags() returns the union of all tags, sorted', () => {
    const tags = listAllJournalTags()

    // Must be sorted
    for (let i = 1; i < tags.length; i++) {
      assert.ok(
        tags[i - 1] <= tags[i],
        `tags are not sorted: "${tags[i - 1]}" comes before "${tags[i]}"`,
      )
    }

    // Must be the union of all post tags
    const allTags = new Set<string>()
    for (const post of JOURNAL_POSTS) {
      for (const tag of post.tags) allTags.add(tag)
    }
    assert.equal(tags.length, allTags.size, 'listAllJournalTags() has wrong number of unique tags')
    for (const tag of allTags) {
      assert.ok(tags.includes(tag), `tag "${tag}" missing from listAllJournalTags() result`)
    }
  })
})
