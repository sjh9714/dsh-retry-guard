import assert from 'node:assert/strict'
import { test } from 'node:test'
import { reportedCase } from '../examples/reported-cases.ts'
import { call, done, notices, results, run } from '../examples/fixture.ts'

for (const [scenario, error] of [
  ['missing-description', /description/],
  ['escalation-empty-justification', /invalid justification: expected a non-empty sentence/],
  ['expired-mcp-session', /Unknown or expired MCP session/],
  ['identical-edit', /old_string and new_string must differ/],
  ['empty-tool-name', /Error: unknown tool/],
] as const) {
  test(`${scenario}: real DSH error boundary, baseline/observe/pause and human resumption`, { timeout: 20_000 }, async () => {
    for (const mode of ['disabled', 'observe', 'pause'] as const) {
      const fixture = await reportedCase(scenario, mode)
      try {
        const { agent, model, summary } = fixture
        const count = mode === 'pause' ? 3 : 6
        assert.equal(summary.toolCalls, count)
        assert.equal(summary.failedCalls, count)
        assert.equal(summary.modelRequests, mode === 'pause' ? 3 : 7)
        assert.equal(summary.paused, mode === 'pause')
        assert.equal(summary.notices, mode === 'disabled' ? 0 : 1)
        assert.equal(summary.shellExecutions, 0)
        assert.equal(fixture.filesystemAccesses(), 0)
        assert.equal(summary.mcpRequests, scenario === 'expired-mcp-session' ? count : 0)
        for (const event of results(agent)) assert.match(JSON.stringify(event.data.message), error)
        assert.doesNotMatch(JSON.stringify(notices(agent)), /fixture-private|Private prompt marker|console\.log|pwd &&/)
        if (mode === 'pause') {
          const original = JSON.stringify(agent.session.snapshotEvents())
          const length = agent.session.snapshotEvents().length
          model.script = [call('repair', { fixed: true }), done()]
          await run(agent, 'Continue with the repaired native call.')
          assert.equal(model.requests.length, 5)
          assert.equal(results(agent).length, 4)
          assert.equal(results(agent).at(-1)?.data.message.isError, false)
          assert.equal(JSON.stringify(agent.session.snapshotEvents().slice(0, length)), original)
        }
      } finally { await fixture.close() }
    }
  })
}

for (const scenario of ['same-mode-empty-justification', 'same-mode-permission'] as const) {
  test(`0.2.0-rc.2 accepts the already-effective sandbox mode: ${scenario}`, async () => {
    const fixture = await reportedCase(scenario, 'pause')
    try {
      assert.deepEqual(fixture.summary, {
        scenario, mode: 'pause', toolCalls: 6, failedCalls: 0,
        modelRequests: 7, notices: 0, paused: false, shellExecutions: 6, mcpRequests: 0,
      })
    } finally { await fixture.close() }
  })
}

test('nonzero bash exit is not a DSH tool error and is outside this detector', async () => {
  const fixture = await reportedCase('nonzero-exit', 'pause')
  try {
    assert.deepEqual(fixture.summary, {
      scenario: 'nonzero-exit', mode: 'pause', toolCalls: 6, failedCalls: 0,
      modelRequests: 7, notices: 0, paused: false, shellExecutions: 6, mcpRequests: 0,
    })
    for (const event of results(fixture.agent)) assert.match(JSON.stringify(event.data.message), /exit code: 1/)
  } finally { await fixture.close() }
})

test('six identical MCP errors interleaved with successful calls do not meet the consecutive-failure rule', async () => {
  const fixture = await reportedCase('interleaved-mcp-errors', 'pause')
  try {
    assert.deepEqual(fixture.summary, {
      scenario: 'interleaved-mcp-errors', mode: 'pause', toolCalls: 12, failedCalls: 6,
      modelRequests: 13, notices: 0, paused: false, shellExecutions: 0, mcpRequests: 6,
    })
  } finally { await fixture.close() }
})

test('changing code with the same missing description does not meet the identical-arguments rule', async () => {
  const fixture = await reportedCase('changed-code', 'pause')
  try {
    assert.equal(fixture.summary.failedCalls, 6)
    assert.equal(fixture.summary.modelRequests, 7)
    assert.equal(fixture.summary.notices, 0)
    assert.equal(fixture.summary.paused, false)
    for (const event of results(fixture.agent)) assert.match(JSON.stringify(event.data.message), /description/)
  } finally { await fixture.close() }
})

for (const scenario of ['text-only', 'markup-as-text'] as const) {
  test(`${scenario}: bounded text without tool calls produces no guard notice or pause`, async () => {
    const fixture = await reportedCase(scenario, 'pause')
    try {
      assert.equal(fixture.summary.toolCalls, 0)
      assert.equal(fixture.summary.modelRequests, 1)
      assert.equal(fixture.summary.notices, 0)
      assert.equal(fixture.summary.paused, false)
    } finally { await fixture.close() }
  })
}
