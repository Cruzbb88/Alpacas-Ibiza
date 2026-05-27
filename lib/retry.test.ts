import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { withRetry } from './retry.ts'

describe('withRetry', () => {
    it('resolves on first try — fn called exactly once', async () => {
        let calls = 0
        const result = await withRetry(async () => {
            calls++
            return 'ok'
        }, { baseDelayMs: 0 })
        assert.equal(result, 'ok')
        assert.equal(calls, 1)
    })

    it('resolves on second try — fn called twice, returns second result', async () => {
        let calls = 0
        const result = await withRetry(async () => {
            calls++
            if (calls < 2) throw new Error('transient')
            return 'second'
        }, { baseDelayMs: 0 })
        assert.equal(result, 'second')
        assert.equal(calls, 2)
    })

    it('fails all 3 attempts — re-throws the LAST error (not the first)', async () => {
        let calls = 0
        await assert.rejects(
            () => withRetry(async () => {
                calls++
                throw new Error(`error-${calls}`)
            }, { baseDelayMs: 0 }),
            (err: unknown) => {
                assert.ok(err instanceof Error)
                assert.equal(err.message, 'error-3')
                return true
            },
        )
        assert.equal(calls, 3)
    })

    it('shouldRetry returns false — fn called once, error propagates immediately (no retry)', async () => {
        let calls = 0
        await assert.rejects(
            () => withRetry(
                async () => { calls++; throw new Error('fatal') },
                { baseDelayMs: 0, shouldRetry: () => false },
            ),
            /fatal/,
        )
        assert.equal(calls, 1)
    })

    it('honors custom attempts: 5', async () => {
        let calls = 0
        await assert.rejects(
            () => withRetry(
                async () => { calls++; throw new Error('x') },
                { attempts: 5, baseDelayMs: 0 },
            ),
        )
        assert.equal(calls, 5)
    })

    it('honors custom baseDelayMs: 0 (does not wait)', async () => {
        const start = Date.now()
        let calls = 0
        await assert.rejects(
            () => withRetry(
                async () => { calls++; throw new Error('fast') },
                { attempts: 3, baseDelayMs: 0 },
            ),
        )
        assert.ok(Date.now() - start < 200, 'should complete quickly with baseDelayMs: 0')
        assert.equal(calls, 3)
    })

    it('default attempts is 3', async () => {
        let calls = 0
        await assert.rejects(
            () => withRetry(async () => {
                calls++
                throw new Error('always')
            }, { baseDelayMs: 0 }),
        )
        assert.equal(calls, 3)
    })
})
