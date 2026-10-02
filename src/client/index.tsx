import React, { useState, useSyncExternalStore } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { PluginConfigViewProps, ConfigPageForm } from '@deepseek-ai/dsh-client-ui-plugin-manager/client'
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { GuardReport } from '../index.ts'

export const inject = ['slots']

// Use the host's typography and color scheme. A single vertical form keeps
// observation versus pausing, the only consequential choice, easy to compare.
const css = `
.retry-guard-form{font:inherit;line-height:1.5;max-width:38rem;color:inherit}
.retry-guard-form fieldset{border:0;padding:0;margin:0;display:grid;gap:1.25rem;min-width:0}
.retry-guard-form label{display:grid;gap:.4rem;font-weight:600}
.retry-guard-form input,.retry-guard-form select,.retry-guard-form textarea{box-sizing:border-box;width:100%;font:inherit;font-weight:400;color:inherit;background:transparent;border:1px solid #9399a4;border-radius:7px;padding:.6rem .75rem}
.retry-guard-form select option{color:CanvasText;background:Canvas}
.retry-guard-form textarea{resize:vertical;min-height:5rem}
.retry-guard-form small{font-weight:400;opacity:.8}
.retry-guard-form :focus-visible{outline:2px solid #416fc9;outline-offset:3px}
.retry-guard-form .retry-guard-actions{display:flex;gap:.65rem;flex-wrap:wrap;margin-top:1.4rem}
.retry-guard-form button{font:inherit;padding:.55rem 1rem;border:1px solid #9399a4;border-radius:7px;cursor:pointer;color:inherit;background:transparent}
.retry-guard-form button[type=submit]{background:#315cce;border-color:#315cce;color:#fff}
.retry-guard-form button:disabled{opacity:.5;cursor:default}
.retry-guard-form [role=alert]{color:#b42a32}
.retry-guard-form .retry-guard-status{min-height:1.5em;margin-top:.8rem}
`

interface Draft { mode: 'observe' | 'pause'; limit: string; excluded: string; revision: number | undefined }

function fromForm(form: ConfigPageForm): Draft {
  const value = form.state.value ?? {}
  return {
    mode: value.mode === 'pause' ? 'pause' : 'observe', limit: String(value.failureLimit ?? 3),
    excluded: Array.isArray(value.excludeTools) ? value.excludeTools.join('\n') : '', revision: form.state.revision,
  }
}

function GuardSettings({ view, form }: PluginConfigViewProps) {
  const [draft, setDraft] = useState<Draft>()
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [failed, setFailed] = useState(false)
  if (view === 'summary') return 'Observe repeated failures, or pause before the next model step.'
  if (!form || form.state.status !== 'ready') return <p role="status">Waiting for Retry Guard settings…</p>
  const values = draft ?? fromForm(form)
  const edit = (change: Partial<Draft>) => {
    setDraft({ ...values, ...change }); setStatus(''); setFailed(false)
  }
  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (!form || busy) return
    const limit = Number(values.limit)
    if (!Number.isSafeInteger(limit) || limit < 2) {
      setStatus('Enter a whole number of at least 2.'); setFailed(true); return
    }
    setBusy(true); setStatus(''); setFailed(false)
    try {
      const accepted = await form.mutate([
        { op: 'set', path: ['mode'], value: values.mode },
        { op: 'set', path: ['failureLimit'], value: limit },
        { op: 'set', path: ['excludeTools'], value: [...new Set(values.excluded.split('\n').map(x => x.trim()).filter(Boolean))] },
      ], values.revision)
      if (accepted) { setDraft(undefined); setStatus('Settings saved. New calls use these settings.') }
      else { setFailed(true); setStatus('Settings were not saved. Reload saved settings and try again.') }
    } catch {
      setFailed(true); setStatus('Could not save settings. Check the DSH connection and try again.')
    } finally { setBusy(false) }
  }
  return <form className="retry-guard-form" onSubmit={save}>
    <style>{css}</style>
    <fieldset disabled={busy || !form.state.writable}>
      <label htmlFor="retry-guard-mode">Mode
        <select id="retry-guard-mode" value={values.mode} onChange={e => edit({ mode: e.target.value as Draft['mode'] })}>
          <option value="observe">Observe — show a notice and keep working</option>
          <option value="pause">Pause — stop before the next model step</option>
        </select>
        <small>Pausing lets running tools finish. Send a new instruction after fixing the cause to continue.</small>
      </label>
      <label htmlFor="retry-guard-limit">Consecutive failure limit
        <input id="retry-guard-limit" type="number" min="2" step="1" required value={values.limit} onChange={e => edit({ limit: e.target.value })} />
        <small>The tool, normalized arguments and failure content must all match.</small>
      </label>
      <label htmlFor="retry-guard-excluded">Excluded tools
        <textarea id="retry-guard-excluded" placeholder="One exact tool name per line" value={values.excluded} onChange={e => edit({ excluded: e.target.value })} />
        <small>Excluded calls break the failure streak. Wildcards are not supported.</small>
      </label>
    </fieldset>
    <div className="retry-guard-actions">
      <button type="submit" disabled={busy || !draft || !form.state.writable}>{busy ? 'Saving…' : 'Save settings'}</button>
      <button type="button" disabled={busy} onClick={() => { setDraft(undefined); setFailed(false); setStatus('Loaded saved settings.') }}>Reload saved settings</button>
    </div>
    <p className="retry-guard-status" role={failed ? 'alert' : 'status'}>{status}</p>
  </form>
}

export function apply(ctx: Context): void {
  ctx.slots.inject('plugins.row.config', () => ctx.slots.register({
    name: 'plugins.row.config', key: 'dsh-retry-guard#dsh-retry-guard',
  }, GuardSettings))
  // DSH 0.2.0-rc.2 hides ordinary injected context in Chat. Keep the durable
  // native notice and additionally expose it in the completed turn's own seat.
  ctx.slots.inject('conversation.chat.turnTail', () => ctx.slots.register({
    name: 'conversation.chat.turnTail', id: 'dsh-retry-guard.report',
  }, GuardNotice))
}

function GuardNotice({ turn, useChat }: PropsRuntime<'conversation.chat.turnTail'>) {
  const source = useChat(snapshot => snapshot.nodes.turnDataSource(turn.turn, 'context'))
  const contexts = useSyncExternalStore(source.subscribe, source.getSnapshot)
  const reports = contexts.flatMap(context => {
    const source = context.source as { kind?: string; report?: GuardReport } | null
    return source?.kind === 'dsh-retry-guard' && source.report?.schemaVersion === 1
      ? [{ seq: context.seq, report: source.report }] : []
  })
  if (!reports.length) return null
  return <>{reports.map(({ seq, report }) => <section key={seq} aria-label="Retry Guard report" style={{
    border: '1px solid #9399a4', borderLeft: '4px solid #b88318', borderRadius: 8,
    padding: '1rem 1.25rem', margin: '.75rem 0', lineHeight: 1.6, overflowWrap: 'anywhere',
  }}>
    <strong>Retry Guard {report.action}: {report.toolName} failed {report.failureCount} times</strong>
    <p style={{ margin: '.45rem 0' }}>{report.action === 'paused'
      ? 'The next model step was paused. Inspect the original failure, fix the cause, then send a new instruction.'
      : 'Observation only. The agent was allowed to continue.'}</p>
    <small><time dateTime={report.detectedAt}>{report.detectedAt}</time> · Same tool, arguments and failure.</small>
    <p style={{ margin: '.45rem 0' }}>Original records: open <b>Trajectory</b> and inspect {report.resultRefs.length
      ? report.resultRefs.map(ref => `event #${ref.seq} (call ${ref.callId})`).join(', ')
      : `call ${report.lastCallId}`}.</p>
    <small>Running parallel calls may finish. Failed calls are never automatically replayed.</small>
    <details style={{ marginTop: '.6rem' }}>
      <summary style={{ cursor: 'pointer' }}>Shareable metadata</summary>
      <pre style={{ whiteSpace: 'pre-wrap', fontSize: '.8rem' }}>{JSON.stringify(report, null, 2)}</pre>
    </details>
  </section>)}</>
}
