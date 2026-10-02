import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import * as Guard from '../lib/index.js'
import { call, done, harness, notices, results, run } from './fixture.ts'

const records = []
console.log('Real DSH 0.2.0-rc.2 loop + scripted model. No API key or model network traffic.')
for (const mode of ['disabled', 'observe', 'pause']) {
  const script = [...Array.from({ length: 6 }, (_, i) => call(`c${i + 1}`)), done()]
  const { ctx, agent, model, plugin } = await harness(script, { mode: mode === 'disabled' ? 'observe' : mode }, Guard)
  try {
    if (mode === 'disabled') await plugin.dispose()
    await run(agent)
    const calls = results(agent).length
    assert.equal(calls, mode === 'pause' ? 3 : 6)
    assert.equal(model.requests.length, mode === 'pause' ? 3 : 7)
    assert.equal(notices(agent).length, mode === 'disabled' ? 0 : 1)
    const reportText = notices(agent)[0]?.data.content.map(block => block.type === 'text' ? block.text : '').join('\n')
    const report = reportText ? JSON.parse(reportText.match(/```json\s*([\s\S]*?)\s*```/)[1]) : undefined
    records.push({ mode, toolCalls: calls, modelRequests: model.requests.length, report })
    console.log(`${mode.padEnd(8)}: ${calls} tool calls; ${model.requests.length} model requests; ${report?.action ?? 'guard not mounted'}`)
    if (mode === 'pause') {
      model.script = [call('repaired', { fixed: true }), done()]
      await run(agent, 'The cause is fixed. Continue with repaired input.')
      assert.equal(results(agent).at(-1).data.message.isError, false)
      assert.equal(results(agent).length, 4)
      console.log('resume : new human instruction → one successful repaired call; no automatic replay')
    }
  } finally { await ctx.fiber.dispose() }
}
await mkdir(new URL('../artifacts/', import.meta.url), { recursive: true })
await writeFile(new URL('../artifacts/demo-results.json', import.meta.url), JSON.stringify({
  generatedAt: new Date().toISOString(), dshVersion: '0.2.0-rc.2', nodeVersion: process.version,
  model: 'Scripted fixture, not a production AI model', records,
}, null, 2) + '\n')
