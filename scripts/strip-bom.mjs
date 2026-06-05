#!/usr/bin/env node
// Self-healing BOM guard (philosophy 020 — the BOM is invisible to tsc and
// breaks Turbopack's JSON parser). Windows tooling / Python migration scripts
// keep writing translations/*.json with a UTF-8 BOM. This runs as `prebuild`
// (and can be run manually) to strip it so the build never fails on a 3-byte
// encoding artifact again.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = join(process.cwd(), 'translations')
let stripped = 0
for (const f of readdirSync(dir)) {
  if (!f.endsWith('.json')) continue
  const p = join(dir, f)
  const raw = readFileSync(p, 'utf8')
  if (raw.charCodeAt(0) === 0xfeff) {
    const clean = raw.replace(/^﻿/, '')
    JSON.parse(clean) // fail loudly if stripping somehow corrupts it
    writeFileSync(p, clean)
    stripped++
    console.log(`[strip-bom] stripped BOM from translations/${f}`)
  }
}
if (stripped === 0) console.log('[strip-bom] no BOM found — clean')
