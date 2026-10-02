import { createServer } from 'node:http'
import { once } from 'node:events'
import type { Context } from '@deepseek-ai/cordis'
import type { StreamChunk } from '@deepseek-ai/dsh-llm'
import PtcRuntime from '@deepseek-ai/dsh-ptc-runtime'
import ShellExecutor from '@deepseek-ai/dsh-shell'
import type { ShellExecRequest, ShellExecSpec, ShellExecution } from '@deepseek-ai/dsh-shell'
import * as ShellEnv from '@deepseek-ai/dsh-shell-env'
import SandboxPolicy from '@deepseek-ai/dsh-sandbox-policy'
import * as BashTool from '@deepseek-ai/dsh-tool-bash'
import * as McpClient from '@deepseek-ai/dsh-mcp-client'
import { call, done, harness, notices, results, run } from './fixture.ts'

/** Missing-description calls must fail in the real DSH validator before here. */
class UnusedPtcRuntime extends PtcRuntime {
  readonly language = 'typescript'
  readonly isolation = 'fixture-sentinel'
  resolve(): never { throw new Error('Unexpected PTC execution: fixture only tests validation') }
  async run(): Promise<never> { throw new Error('Unexpected PTC execution') }
}

/** Replace OS execution only. The bash schema, policy and approval path are real. */
class RecordingShell extends ShellExecutor {
  executions = 0
  exitCode = 0
  get sandboxMode() { return 'danger-full-access' as const }
  resolve(request: ShellExecRequest): ShellExecSpec {
    return { ...request, workdir: '/fixture', timeoutMs: 1000, onExpiry: 'kill',
      stdoutMaxBytes: 4096, sandboxPolicy: request.sandboxPolicy }
  }
  async execute(spec: ShellExecSpec): Promise<ShellExecution> {
    this.executions++
    const empty = { text: '', truncated: false }
    const reader = { readFrom: () => ({ text: '', nextOffset: 0, lossy: false }) }
    return {
      status: 'completed', exitCode: this.exitCode, signal: null, done: Promise.resolve(),
      observed: { stdout: reader, stderr: reader },
      readOutput: () => ({ delta: '', lossy: false }), kill: () => false,
      result: async () => ({ exitCode: this.exitCode, signal: null, timedOut: false, aborted: false,
        timeoutMs: spec.timeoutMs, stdout: empty, stderr: empty }),
    }
  }
}

/** A local protocol fixture, not a real third-party server with an expired session. */
async function expiredMcpServer() {
  let calls = 0
  const server = createServer(async (req, res) => {
    if (req.method !== 'POST') { res.writeHead(405).end(); return }
    let raw = ''
    for await (const chunk of req) raw += chunk
    const request = JSON.parse(raw)
    if (request.id === undefined) { res.writeHead(202).end(); return }
    const response: Record<string, unknown> = { jsonrpc: '2.0', id: request.id }
    switch (request.method) {
      case 'initialize':
        response.result = { protocolVersion: request.params.protocolVersion,
          capabilities: { tools: {} }, serverInfo: { name: 'expired-session-fixture', version: '1' } }
        break
      case 'tools/list':
        response.result = { tools: [{ name: 'lookup', description: 'Local expired-session fixture',
          inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } }] }
        break
      case 'tools/call':
        calls++
        response.error = { code: -32001, message: 'Unknown or expired MCP session' }
        break
      default: response.error = { code: -32601, message: 'Method not found' }
    }
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(response))
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No local MCP port')
  return {
    url: `http://127.0.0.1:${address.port}/mcp`, calls: () => calls,
    close: () => new Promise<void>((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve())
      server.closeAllConnections()
    }),
  }
}

const repeated = (name: string, args: object) =>
  [...Array.from({ length: 6 }, (_, i) => call(`reported-${i}`, args, name)), done()]
const bashArgs = { command: 'pwd && ls -la && git status --short --branch', description: 'Read directory and Git status.',
  sandbox_permissions: 'danger-full-access', justification: '' }
const missingDescription = { code: 'console.log("fixture-private-code")' }
const mcpName = 'mcp__reported__lookup'

export const scenarioNames = [
  'missing-description', 'escalation-empty-justification', 'same-mode-empty-justification',
  'same-mode-permission', 'nonzero-exit',
  'expired-mcp-session', 'interleaved-mcp-errors', 'changed-code', 'text-only',
] as const
export type Scenario = typeof scenarioNames[number]
export type GuardMode = 'disabled' | 'observe' | 'pause'

function scriptFor(scenario: Scenario): StreamChunk[][] {
  switch (scenario) {
    case 'missing-description': return repeated('run_code', missingDescription)
    case 'escalation-empty-justification':
    case 'same-mode-empty-justification': return repeated('bash', bashArgs)
    case 'same-mode-permission': return repeated('bash', { ...bashArgs, justification: 'Read directory and Git status.' })
    case 'nonzero-exit': return repeated('bash', { command: 'exit 1', description: 'Deliberately fail.' })
    case 'expired-mcp-session': return repeated(mcpName, { query: 'fixture-private-query' })
    case 'interleaved-mcp-errors': return [
      ...Array.from({ length: 6 }, (_, i) => [call(`mcp-${i}`, { query: 'fixture-private-query' }, mcpName),
        call(`success-${i}`, { fixed: true })]).flat(), done(),
    ]
    case 'changed-code': return [
      ...Array.from({ length: 6 }, (_, i) => call(`changed-${i}`, { code: `console.log(${i})` }, 'run_code')), done(),
    ]
    case 'text-only': {
      const text = 'I will check Git status. '.repeat(6)
      return [[{ type: 'block-start', index: 0, blockType: 'text' },
        { type: 'text-delta', index: 0, text },
        { type: 'block-end', index: 0, block: { type: 'text', text } },
        { type: 'finish', reason: { kind: 'stop' } }]]
    }
  }
}

export async function reportedCase(scenario: Scenario, mode: GuardMode) {
  const fixture = await harness(scriptFor(scenario), { mode: mode === 'disabled' ? 'observe' : mode })
  let mcp: Awaited<ReturnType<typeof expiredMcpServer>> | undefined
  const close = async () => {
    try { await fixture.ctx.fiber.dispose() } finally { await mcp?.close() }
  }
  try {
    if (mode === 'disabled') await fixture.plugin.dispose()
    const ctx: Context = fixture.ctx
    if (scenario === 'missing-description' || scenario === 'changed-code') {
      await ctx.plugin(UnusedPtcRuntime)
      fixture.agent.ctx.tools.presentAs('both')
    }
    if (['escalation-empty-justification', 'same-mode-empty-justification', 'same-mode-permission', 'nonzero-exit'].includes(scenario)) {
      await ctx.plugin(RecordingShell)
      if (scenario === 'nonzero-exit') (ctx.shell as RecordingShell).exitCode = 1
      await ctx.plugin(ShellEnv)
      // This policy exists only inside the fixture; no host settings are edited.
      await ctx.plugin(SandboxPolicy, { mode: scenario === 'escalation-empty-justification' ? 'read-only' : 'danger-full-access' })
      await ctx.plugin(BashTool, { enableRunInBackground: false })
    }
    if (scenario === 'expired-mcp-session' || scenario === 'interleaved-mcp-errors') {
      mcp = await expiredMcpServer()
      await ctx.plugin(McpClient, { transport: 'streamable-http', serverName: 'reported', url: mcp.url,
        headers: {}, toolCallTimeoutMs: 2000, failOnStartupError: true })
    }
    await run(fixture.agent)
    const outcomes = results(fixture.agent)
    const summary = {
      scenario, mode, toolCalls: outcomes.length,
      failedCalls: outcomes.filter(event => event.data.message.isError).length,
      modelRequests: fixture.model.requests.length, notices: notices(fixture.agent).length,
      paused: fixture.agent.session.snapshotEvents().some(event =>
        event.type === 'turn/end' && event.data.reason.kind === 'blocked'),
      shellExecutions: ctx.get('shell') ? (ctx.shell as RecordingShell).executions : 0,
      mcpRequests: mcp?.calls() ?? 0,
    }
    return { ...fixture, summary, close }
  } catch (error) { await close(); throw error }
}
