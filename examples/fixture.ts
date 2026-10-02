import { Context } from '@deepseek-ai/cordis'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import { mountAgentLoopTestDependencies } from '@deepseek-ai/dsh-agent-loop-testkit'
import { LlmAdapter, ToolCallId, createUserMessage } from '@deepseek-ai/dsh-llm'
import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm'
import { SessionId } from '@deepseek-ai/dsh-session'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { defineContentToolFixture } from '@deepseek-ai/dsh-tools'
import * as RetryGuard from '../src/index.ts'

/** Only the paid model is replaced. Agents, inbox, tools and session are real DSH. */
export class ScriptedModel extends LlmAdapter {
  requests: GenerateOptions[] = []
  script: StreamChunk[][]
  constructor(script: StreamChunk[][]) { super(); this.script = [...script] }
  async resolveModel(provider: string, model: string) {
    return { provider, id: model, name: 'Scripted fixture (no AI)' }
  }
  async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    this.requests.push(options)
    const chunks = this.script.shift()
    if (!chunks) throw new Error('Scripted model exhausted')
    for (const chunk of chunks) { options.signal?.throwIfAborted(); yield chunk }
  }
}

export function call(id: string, args: object = { path: '/missing', token: 'fixture-secret' }, name = 'probe'): StreamChunk[] {
  const callId = ToolCallId(id)
  return [
    { type: 'block-start', index: 0, blockType: 'tool-call' },
    { type: 'tool-call-delta', index: 0, id: callId, name, argumentsDelta: JSON.stringify(args) },
    { type: 'block-end', index: 0, block: { type: 'tool-call', id: callId, name, arguments: JSON.stringify(args) } },
    { type: 'finish', reason: { kind: 'tool-calls' } },
  ]
}

export function done(): StreamChunk[] {
  return [
    { type: 'block-start', index: 0, blockType: 'text' },
    { type: 'text-delta', index: 0, text: 'Fixture finished.' },
    { type: 'block-end', index: 0, block: { type: 'text', text: 'Fixture finished.' } },
    { type: 'finish', reason: { kind: 'stop' } },
  ]
}

export function human(text: string) {
  return createUserMessage({ content: [{ type: 'text', text }], source: { kind: 'user' } })
}

export async function harness(script: StreamChunk[][], options: RetryGuard.Options = {}, guard = RetryGuard) {
  const ctx = new Context()
  await mountAgentLoopTestDependencies(ctx)
  await ctx.plugin(AgentLoop, { agents: [] })
  const plugin = await ctx.plugin(guard, options)
  const model = new ScriptedModel(script)
  ctx.llm.registerAdapter(['scripted'], model)
  ctx.tools.register(defineContentToolFixture({
    name: 'probe', description: 'A deterministic local test tool', parameters: {},
    async execute(args: unknown) {
      if ((args as { fixed?: boolean }).fixed) return [{ type: 'text', text: 'ok' }]
      throw new Error('Not found: fixture-secret')
    },
  }))
  const agent = await ctx.agentLoop.create(SessionId('retry-guard-fixture'), { provider: 'scripted', model: 'fixture' })
  return { ctx, model, agent, plugin }
}

export async function run(agent: Agent, text = 'Run the local fixture. Private prompt marker.') {
  agent.followup(human(text))
  await agent.whenIdle()
}

export function notices(agent: Agent) {
  return agent.session.snapshotEvents().filter(event =>
    event.type === 'user/message' && event.data.source.kind === 'dsh-retry-guard')
}

export function results(agent: Agent) {
  return agent.session.snapshotEvents().filter(event => event.type === 'tool/result')
}
