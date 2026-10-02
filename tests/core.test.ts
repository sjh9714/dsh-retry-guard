import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FailureTracker, type Outcome } from '../src/core.ts'

function failed(callId: string, changes: Partial<Outcome> = {}): Outcome {
  return {
    turn: 1, toolName: 'probe', arguments: { path: '/missing' },
    failure: { message: 'Not found', content: [{ type: 'text', text: 'Not found' }] },
    callId, rootCallId: callId, time: Date.UTC(2026, 9, 1, 0, 0, Number(callId.slice(1)) || 0),
    ...changes,
  }
}

test('detects only at the third consecutive identical failure, with evidence but no raw payload', () => {
  const guard = new FailureTracker()
  assert.equal(guard.observe(failed('c1')), undefined)
  assert.equal(guard.observe(failed('c2')), undefined)
  assert.deepEqual(guard.observe(failed('c3')), {
    turn: 1, toolName: 'probe', failureCount: 3,
    firstSeenAt: '2026-10-01T00:00:01.000Z', detectedAt: '2026-10-01T00:00:03.000Z',
    firstCallId: 'c1', lastCallId: 'c3', firstRootCallId: 'c1', lastRootCallId: 'c3',
  })
  assert.equal(guard.observe(failed('c4')), undefined, 'one notice per uninterrupted streak')
})

test('normalizes nested object key order without changing array order or string contents', () => {
  const guard = new FailureTracker()
  guard.observe(failed('c1', { arguments: { b: 2, a: { y: 4, x: 3 } } }))
  guard.observe(failed('c2', { arguments: { a: { x: 3, y: 4 }, b: 2 } }))
  assert.equal(guard.observe(failed('c3', { arguments: { b: 2, a: { x: 3, y: 4 } } }))?.failureCount, 3)
  for (const args of [[1, 2], [2, 1], 'a ', 'a', { x: 1 }]) {
    assert.equal(guard.observe(failed('c4', { arguments: args })), undefined)
  }
})

test('success, changed call, changed error, excluded tool, or new turn breaks the chain', () => {
  const interruptions: Partial<Outcome>[] = [
    { failure: undefined }, { toolName: 'other' }, { arguments: { path: '/fixed' } },
    { failure: { message: 'Permission denied' } }, { toolName: 'status' }, { turn: 2 },
  ]
  for (const interruption of interruptions) {
    const guard = new FailureTracker(3, ['status'])
    guard.observe(failed('c1')); guard.observe(failed('c2'))
    assert.equal(guard.observe(failed('c3', interruption)), undefined)
    assert.equal(guard.observe(failed('c4')), undefined)
    assert.equal(guard.observe(failed('c5')), undefined)
    assert.equal(guard.observe(failed('c6'))?.failureCount, 3)
  }
})

test('a manual reset permits a repaired retry, and independent trackers do not share state', () => {
  const first = new FailureTracker(), second = new FailureTracker()
  first.observe(failed('c1')); first.observe(failed('c2'))
  assert.equal(second.observe(failed('c3')), undefined)
  first.reset()
  assert.equal(first.observe(failed('c4')), undefined)
  assert.equal(first.observe(failed('c5')), undefined)
  assert.equal(first.observe(failed('c6'))?.failureCount, 3)
})

test('rejects unusable limits and honors a custom limit', () => {
  for (const limit of [0, 1, -1, 2.5, Infinity, NaN]) assert.throws(() => new FailureTracker(limit))
  const guard = new FailureTracker(2)
  guard.observe(failed('c1'))
  assert.equal(guard.observe(failed('c2'))?.failureCount, 2)
})
