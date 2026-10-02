import type { Context } from '@deepseek-ai/cordis'
import { LlmAdapter, ToolCallId } from '@deepseek-ai/dsh-llm'
import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm'
import { defineContentToolFixture } from '@deepseek-ai/dsh-tools'
import { setTimeout as delay } from 'node:timers/promises'

export const name = 'retry-guard-demo-fixture'
export const inject = ['llm', 'tools']

/** Local scripted model for the demo only. It never sends an HTTP request. */
class DemoModel extends LlmAdapter {
  private calls = new Map<string, number>()
  private repaired = new Set<string>()
  providerInfo(provider: string) { return { id: provider, name: 'Retry Guard demo (scripted)' } }
  async listModels(provider: string) { return [{ provider, id: 'local-fixture', name: 'Local fixture · no API key' }] }
  async resolveModel(provider: string, model: string) { return { provider, id: model, name: 'Local fixture · no API key' } }
  async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    // Title/compaction requests are separate work; they must not consume a
    // scripted assistant attempt or make the demo claim six calls after three.
    if (options.purpose !== undefined) {
      const text = 'Retry Guard demo (scripted)'
      yield { type: 'block-start', index: 0, blockType: 'text' }
      yield { type: 'text-delta', index: 0, text }
      yield { type: 'block-end', index: 0, block: { type: 'text', text } }
      yield { type: 'finish', reason: { kind: 'stop' } }
      return
    }
    const session = String(options.sessionId ?? 'fixture')
    const count = (this.calls.get(session) ?? 0) + 1
    this.calls.set(session, count)
    const repaired = options.messages.some(message => message.role === 'user' && message.content.some(
      block => block.type === 'text' && block.text.toLowerCase().includes('fixture repair')))
    const finished = repaired ? this.repaired.has(session) : count > 6
    await delay(400, undefined, { signal: options.signal })
    if (finished) {
      const text = repaired ? 'Fixture recovered. The repaired tool succeeded.' : 'Scripted fixture finished after six attempts.'
      yield { type: 'block-start', index: 0, blockType: 'text' }
      yield { type: 'text-delta', index: 0, text }
      yield { type: 'block-end', index: 0, block: { type: 'text', text } }
      yield { type: 'finish', reason: { kind: 'stop' } }
      return
    }
    if (repaired) this.repaired.add(session)
    const id = ToolCallId(`fixture-call-${count}`)
    const args = JSON.stringify({ target: 'demo-resource', fixed: repaired })
    yield { type: 'block-start', index: 0, blockType: 'tool-call' }
    yield { type: 'tool-call-delta', index: 0, id, name: 'retry_guard_probe', argumentsDelta: args }
    yield { type: 'block-end', index: 0, block: { type: 'tool-call', id, name: 'retry_guard_probe', arguments: args } }
    yield { type: 'finish', reason: { kind: 'tool-calls' } }
  }
}

export function apply(ctx: Context): void {
  ctx.llm.registerAdapter(['retry-guard-demo'], new DemoModel())
  ctx.tools.register(defineContentToolFixture({
    name: 'retry_guard_probe', description: 'Local demo fixture; no file, shell or network access.', parameters: {},
    async execute(args: unknown) {
      if ((args as { fixed?: boolean }).fixed) return [{ type: 'text', text: 'Demo resource repaired.' }]
      throw new Error('Demo resource unavailable. Correct the input before retrying.')
    },
  }))
}
