import type { Context, Volatile } from '@deepseek-ai/cordis'
import type { Agent, PreStepDecision } from '@deepseek-ai/dsh-agent'
import type { ContextFormed } from '@deepseek-ai/dsh-llm'
import type { SessionSeq } from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-tools'
import type { Detection } from './core.ts'
export interface Options { mode?: 'observe' | 'pause'; failureLimit?: number; excludeTools?: string[] }
export interface Config { mode: Volatile<'observe' | 'pause'>; failureLimit: Volatile<number>; excludeTools: Volatile<string[]> }
declare module '@deepseek-ai/dsh-llm' { interface MessageSourceMap { 'dsh-retry-guard': { kind: 'dsh-retry-guard'; report?: GuardReport } & ContextFormed } }
export interface GuardReport extends Detection { schemaVersion: 1; sessionId: string; mode: 'observe' | 'pause'; action: 'observed' | 'paused'; resultRefs: { seq: number; callId: string }[] }
interface State { configKey: string; tracker: FailureTracker; turn?: number; detection?: Detection; paused: boolean }
import z from '@deepseek-ai/schemastery';
import { createUserMessage } from '@deepseek-ai/dsh-llm';
import { FailureTracker } from './core.ts';
export const name = 'dsh-retry-guard';
export const Config = z.object({
    mode: z.union([z.const('observe'), z.const('pause')]).default('observe').volatile(),
    failureLimit: z.number().min(2).step(1).default(3).volatile(),
    excludeTools: z.array(z.string()).default([]).volatile(),
});
/** No raw tool data, conversation content, or error messages are serialized here. */
function reportFor(agent: Agent, detection: Detection, mode: 'observe' | 'pause', paused: boolean): GuardReport {
    const ids = new Set([detection.firstRootCallId, detection.lastRootCallId, detection.firstCallId, detection.lastCallId]);
    const resultRefs = agent.session.snapshotEvents().flatMap(event => {
        if (event.type === 'tool/result' && ids.has(event.data.message.toolCallId)) {
            return [{ seq: Number(event.seq), callId: String(event.data.message.toolCallId) }];
        }
        if (event.type === 'tool/ptc-dispatch' && ids.has(event.data.subCallId)) {
            return [{ seq: Number(event.seq), callId: String(event.data.subCallId) }];
        }
        return [];
    });
    return {
        schemaVersion: 1, sessionId: String(agent.id), mode, action: paused ? 'paused' : 'observed',
        turn: detection.turn, toolName: detection.toolName, failureCount: detection.failureCount,
        firstSeenAt: detection.firstSeenAt, detectedAt: detection.detectedAt,
        firstCallId: detection.firstCallId, lastCallId: detection.lastCallId,
        firstRootCallId: detection.firstRootCallId, lastRootCallId: detection.lastRootCallId, resultRefs,
    };
}
function publish(agent: Agent, detection: Detection, mode: 'observe' | 'pause', paused: boolean): void {
    const report = reportFor(agent, detection, mode, paused);
    const summary = `Retry Guard ${report.action}: ${report.toolName.slice(0, 80)} failed ${report.failureCount} times`;
    const refs = report.resultRefs.map(ref => `event #${ref.seq} (call ${ref.callId})`).join(', ');
    const text = [
        summary,
        'The tool name, normalized arguments and failure content matched consecutively.',
        paused
            ? 'No next model step was started. Inspect the original failure, fix the cause, then send a new instruction to continue. Failed calls are not automatically replayed.'
            : 'Observation only: this guard did not stop a model step.',
        `Detected at: ${report.detectedAt}`,
        `Original records in this session: ${refs || `call ${report.lastCallId}`}.`,
        'Already-running parallel calls may have completed after detection.',
        'Shareable metadata (no arguments, error text or conversation):',
        '```json', JSON.stringify(report, null, 2), '```',
    ].join('\n\n');
    agent.session.append('user/message', createUserMessage({
        content: [{ type: 'text', text }],
        source: { kind: 'dsh-retry-guard', form: 'notice', summary, report },
    }), {
        surfaceOp: 'append',
        ...(report.resultRefs.length ? { sourceEventSeqs: report.resultRefs.map(ref => ref.seq as SessionSeq) } : {}),
    });
}
export function apply(ctx: Context, config: Config): void {
    const states = new WeakMap<Agent, State>();
    function stateFor(agent: Agent): { state: State; mode: 'observe' | 'pause' } {
        const mode = config.mode.get(), failureLimit = config.failureLimit.get(), excludeTools = config.excludeTools.get();
        const key = JSON.stringify([mode, failureLimit, excludeTools]);
        let state = states.get(agent);
        if (!state || state.configKey !== key) {
            state = { configKey: key, tracker: new FailureTracker(failureLimit, excludeTools), paused: false };
            states.set(agent, state);
        }
        return { state, mode };
    }
    ctx.on('tools/result', (exec, result) => {
        if (!exec.agent)
            return;
        const { state, mode } = stateFor(exec.agent);
        if (state.turn === undefined)
            return; // Only executions inside an observed agent turn.
        const detected = state.tracker.observe({
            turn: state.turn, toolName: exec.name, arguments: exec.arguments,
            failure: result.isError ? { error: result.error, content: result.content } : undefined,
            callId: String(exec.callId), rootCallId: String(exec.rootCallId), time: Date.now(),
        });
        if (detected) {
            state.detection ??= detected;
            if (mode === 'pause')
                state.paused = true;
        }
    });
    ctx.on('agent/pre-step', async ({ agent, messages, turn }, next): Promise<PreStepDecision> => {
        const { state, mode } = stateFor(agent);
        if (state.turn !== turn) {
            state.tracker.reset();
            state.turn = turn;
        }
        // Human input wins over our latch, including steering queued during a tool.
        if (messages.some(message => message.source.kind === 'user')) {
            state.tracker.reset();
            state.paused = false;
        }
        const downstream = await next();
        if (downstream.kind === 'reject')
            return downstream;
        if (downstream.messages.some(message => message.source.kind === 'user')) {
            state.tracker.reset();
            state.paused = false;
        }
        if (state.detection) {
            publish(agent, state.detection, mode, state.paused);
            state.detection = undefined;
        }
        if (!state.paused)
            return downstream;
        // pre-step receives an already-claimed batch. Park original context without
        // waking the driver; a later human instruction will admit it exactly once.
        for (const message of messages)
            agent.send(message, 'next-step', false);
        return { kind: 'reject' };
    });
}
