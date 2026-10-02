import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SessionId } from '@deepseek-ai/dsh-session'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { StreamChunk } from '@deepseek-ai/dsh-llm'
import { call, done, harness, human, notices, results, run, ScriptedModel } from '../examples/fixture.ts'

test('pause prevents the fourth real model request and preserves all original tool results', { timeout: 10_000 }, async t => {
  const { ctx, agent, model } = await harness([call('c1'), call('c2'), call('c3'), call('c4'), done()], { mode: 'pause' })
  t.after(() => ctx.fiber.dispose())
  await run(agent)
  assert.equal(model.requests.length, 3)
  const outcomes = results(agent)
  assert.equal(outcomes.length, 3)
  assert.ok(outcomes.every(event => event.data.message.isError && JSON.stringify(event.data.message.content).includes('Not found: fixture-secret')))
  const notice = notices(agent)
  assert.equal(notice.length, 1)
  const text = JSON.stringify(notice)
  assert.match(text, /3/); assert.match(text, /probe/); assert.match(text, /c3/)
  assert.ok(!text.includes('fixture-secret') && !text.includes('/missing') && !text.includes('Private prompt marker'))
  assert.deepEqual(notice[0]?.sourceEventSeqs, [outcomes[0]!.seq, outcomes[2]!.seq])
  assert.deepEqual(agent.session.snapshotEvents().at(-1)?.data, { turn: 1, reason: { kind: 'blocked' } })
})

test('default observation records a notice but allows all six failures', async t => {
  const { ctx, agent, model } = await harness([...Array.from({ length: 6 }, (_, i) => call(`c${i + 1}`)), done()])
  t.after(() => ctx.fiber.dispose()); await run(agent)
  assert.equal(model.requests.length, 7); assert.equal(results(agent).length, 6); assert.equal(notices(agent).length, 1)
})

test('successful repeated polling is never paused', async t => {
  const { ctx, agent, model } = await harness([...Array.from({ length: 6 }, (_, i) => call(`c${i}`, { fixed: true })), done()], { mode: 'pause' })
  t.after(() => ctx.fiber.dispose()); await run(agent)
  assert.equal(model.requests.length, 7)
  assert.ok(results(agent).every(event => !event.data.message.isError)); assert.equal(notices(agent).length, 0)
})

test('a new human instruction resumes after a pause without automatically replaying a failed call', async t => {
  const { ctx, agent, model } = await harness([call('c1'), call('c2'), call('c3'), call('fixed', { fixed: true }), done()], { mode: 'pause' })
  t.after(() => ctx.fiber.dispose()); await run(agent)
  assert.equal(model.requests.length, 3)
  await run(agent, 'I fixed the problem. Try the repaired input.')
  assert.equal(model.requests.length, 5); assert.equal(results(agent).length, 4)
  assert.equal(results(agent).at(-1)?.data.message.isError, false)
  assert.equal(agent.session.snapshotEvents().filter(event => event.type === 'user/message' && event.data.source.kind === 'user').length, 2)
})

test('a human message queued during the third failure survives and admits the next step', async t => {
  const { ctx, agent, model } = await harness([call('c1'), call('c2'), call('c3'), done()], { mode: 'pause' })
  t.after(() => ctx.fiber.dispose())
  const queued = human('Stop retrying and explain the failure.')
  ctx.on('tools/result', exec => { if (exec.callId === 'c3') agent.steer(queued) })
  await run(agent); assert.equal(model.requests.length, 4)
  const messages = agent.session.snapshotEvents().filter(event => event.type === 'user/message')
  assert.equal(messages.filter(event => event.data.id === queued.id).length, 1)
})

test('one agent cannot pause another agent sharing the same plugin', async t => {
  const { ctx, agent, model } = await harness([call('c1'), call('c2'), call('c3'), done()], { mode: 'pause' })
  t.after(() => ctx.fiber.dispose())
  const otherModel = new ScriptedModel([call('b1'), call('b2'), done()])
  ctx.llm.registerAdapter(['other'], otherModel)
  const other = await ctx.agentLoop.create(SessionId('other-agent'), { provider: 'other', model: 'fixture' })
  await Promise.all([run(agent), run(other)])
  assert.equal(model.requests.length, 3); assert.equal(otherModel.requests.length, 3); assert.equal(notices(other).length, 0)
})

test('delegates without bypassing another plugin rejecting a step', async t => {
  const { ctx, agent, model } = await harness([done()], { mode: 'pause' })
  t.after(() => ctx.fiber.dispose())
  ctx.on('agent/pre-step', async () => ({ kind: 'reject' as const }))
  await run(agent); assert.equal(model.requests.length, 0)
})

test('non-human queued context stays parked at a pause and is delivered once on human resumption', async t => {
  const { ctx, agent, model } = await harness([call('c1'), call('c2'), call('c3'), done()], { mode: 'pause' })
  t.after(() => ctx.fiber.dispose())
  const context = createUserMessage({
    source: { kind: 'dsh-retry-guard', form: 'instructions' }, content: [{ type: 'text', text: 'Queued context marker' }],
  })
  ctx.on('tools/result', exec => { if (exec.callId === 'c3') agent.inject(context) })
  await run(agent)
  assert.equal(model.requests.length, 3)
  assert.equal(agent.inbox.nextStep.filter(message => message.id === context.id).length, 1)
  await run(agent, 'Continue after inspecting the failure.')
  assert.equal(agent.session.snapshotEvents().filter(event => event.type === 'user/message' && event.data.id === context.id).length, 1)
  assert.equal(agent.inbox.nextStep.length, 0)
})

test('a running parallel batch can finish but cannot start another model request after detection', async t => {
  const batch: StreamChunk[] = []
  for (let i = 0; i < 4; i++) {
    for (const chunk of call(`parallel-${i}`)) {
      if (chunk.type !== 'finish') batch.push('index' in chunk ? { ...chunk, index: i } : chunk)
    }
  }
  batch.push({ type: 'finish', reason: { kind: 'tool-calls' } })
  const { ctx, agent, model } = await harness([batch, done()], { mode: 'pause' })
  t.after(() => ctx.fiber.dispose()); await run(agent)
  assert.equal(model.requests.length, 1)
  assert.equal(results(agent).length, 4)
  assert.equal(notices(agent).length, 1)
})

test('unloading the plugin removes the pause hooks and preserves the original log', async t => {
  const { ctx, agent, plugin, model } = await harness([call('c1'), call('c2'), call('c3'), call('c4'), done()], { mode: 'pause' })
  t.after(() => ctx.fiber.dispose()); await run(agent)
  const before = JSON.stringify(agent.session.snapshotEvents())
  await plugin.dispose()
  assert.equal(JSON.stringify(agent.session.snapshotEvents()), before)
  await run(agent, 'Continue after removing the plugin.')
  assert.equal(model.requests.length, 5)
  assert.equal(results(agent).length, 4)
})
