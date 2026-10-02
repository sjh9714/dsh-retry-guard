import React, { useState, useSyncExternalStore } from 'react';
export const inject = ['slots'];
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
`;
function fromForm(form) {
    const value = form.state.value ?? {};
    return {
        mode: value.mode === 'pause' ? 'pause' : 'observe', limit: String(value.failureLimit ?? 3),
        excluded: Array.isArray(value.excludeTools) ? value.excludeTools.join('\n') : '', revision: form.state.revision,
    };
}
function GuardSettings({ view, form }) {
    const [draft, setDraft] = useState();
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState('');
    const [failed, setFailed] = useState(false);
    if (view === 'summary')
        return 'Observe repeated failures, or pause before the next model step.';
    if (!form || form.state.status !== 'ready')
        return React.createElement("p", { role: "status" }, "Waiting for Retry Guard settings\u2026");
    const values = draft ?? fromForm(form);
    const edit = (change) => {
        setDraft({ ...values, ...change });
        setStatus('');
        setFailed(false);
    };
    async function save(event) {
        event.preventDefault();
        if (!form || busy)
            return;
        const limit = Number(values.limit);
        if (!Number.isSafeInteger(limit) || limit < 2) {
            setStatus('Enter a whole number of at least 2.');
            setFailed(true);
            return;
        }
        setBusy(true);
        setStatus('');
        setFailed(false);
        try {
            const accepted = await form.mutate([
                { op: 'set', path: ['mode'], value: values.mode },
                { op: 'set', path: ['failureLimit'], value: limit },
                { op: 'set', path: ['excludeTools'], value: [...new Set(values.excluded.split('\n').map(x => x.trim()).filter(Boolean))] },
            ], values.revision);
            if (accepted) {
                setDraft(undefined);
                setStatus('Settings saved. New calls use these settings.');
            }
            else {
                setFailed(true);
                setStatus('Settings were not saved. Reload saved settings and try again.');
            }
        }
        catch {
            setFailed(true);
            setStatus('Could not save settings. Check the DSH connection and try again.');
        }
        finally {
            setBusy(false);
        }
    }
    return React.createElement("form", { className: "retry-guard-form", onSubmit: save },
        React.createElement("style", null, css),
        React.createElement("fieldset", { disabled: busy || !form.state.writable },
            React.createElement("label", { htmlFor: "retry-guard-mode" },
                "Mode",
                React.createElement("select", { id: "retry-guard-mode", value: values.mode, onChange: e => edit({ mode: e.target.value }) },
                    React.createElement("option", { value: "observe" }, "Observe \u2014 show a notice and keep working"),
                    React.createElement("option", { value: "pause" }, "Pause \u2014 stop before the next model step")),
                React.createElement("small", null, "Pausing lets running tools finish. Send a new instruction after fixing the cause to continue.")),
            React.createElement("label", { htmlFor: "retry-guard-limit" },
                "Consecutive failure limit",
                React.createElement("input", { id: "retry-guard-limit", type: "number", min: "2", step: "1", required: true, value: values.limit, onChange: e => edit({ limit: e.target.value }) }),
                React.createElement("small", null, "The tool, normalized arguments and failure content must all match.")),
            React.createElement("label", { htmlFor: "retry-guard-excluded" },
                "Excluded tools",
                React.createElement("textarea", { id: "retry-guard-excluded", placeholder: "One exact tool name per line", value: values.excluded, onChange: e => edit({ excluded: e.target.value }) }),
                React.createElement("small", null, "Excluded calls break the failure streak. Wildcards are not supported."))),
        React.createElement("div", { className: "retry-guard-actions" },
            React.createElement("button", { type: "submit", disabled: busy || !draft || !form.state.writable }, busy ? 'Saving…' : 'Save settings'),
            React.createElement("button", { type: "button", disabled: busy, onClick: () => { setDraft(undefined); setFailed(false); setStatus('Loaded saved settings.'); } }, "Reload saved settings")),
        React.createElement("p", { className: "retry-guard-status", role: failed ? 'alert' : 'status' }, status));
}
export function apply(ctx) {
    ctx.slots.inject('plugins.row.config', () => ctx.slots.register({
        name: 'plugins.row.config', key: 'dsh-retry-guard#dsh-retry-guard',
    }, GuardSettings));
    // DSH 0.2.0-rc.2 hides ordinary injected context in Chat. Keep the durable
    // native notice and additionally expose it in the completed turn's own seat.
    ctx.slots.inject('conversation.chat.turnTail', () => ctx.slots.register({
        name: 'conversation.chat.turnTail', id: 'dsh-retry-guard.report',
    }, GuardNotice));
}
function GuardNotice({ turn, useChat }) {
    const source = useChat(snapshot => snapshot.nodes.turnDataSource(turn.turn, 'context'));
    const contexts = useSyncExternalStore(source.subscribe, source.getSnapshot);
    const reports = contexts.flatMap(context => {
        const source = context.source;
        return source?.kind === 'dsh-retry-guard' && source.report?.schemaVersion === 1
            ? [{ seq: context.seq, report: source.report }] : [];
    });
    if (!reports.length)
        return null;
    return React.createElement(React.Fragment, null, reports.map(({ seq, report }) => React.createElement("section", { key: seq, "aria-label": "Retry Guard report", style: {
            border: '1px solid #9399a4', borderLeft: '4px solid #b88318', borderRadius: 8,
            padding: '1rem 1.25rem', margin: '.75rem 0', lineHeight: 1.6, overflowWrap: 'anywhere',
        } },
        React.createElement("strong", null,
            "Retry Guard ",
            report.action,
            ": ",
            report.toolName,
            " failed ",
            report.failureCount,
            " times"),
        React.createElement("p", { style: { margin: '.45rem 0' } }, report.action === 'paused'
            ? 'The next model step was paused. Inspect the original failure, fix the cause, then send a new instruction.'
            : 'Observation only. The agent was allowed to continue.'),
        React.createElement("small", null,
            React.createElement("time", { dateTime: report.detectedAt }, report.detectedAt),
            " \u00B7 Same tool, arguments and failure."),
        React.createElement("p", { style: { margin: '.45rem 0' } },
            "Original records: open ",
            React.createElement("b", null, "Trajectory"),
            " and inspect ",
            report.resultRefs.length
                ? report.resultRefs.map(ref => `event #${ref.seq} (call ${ref.callId})`).join(', ')
                : `call ${report.lastCallId}`,
            "."),
        React.createElement("small", null, "Running parallel calls may finish. Failed calls are never automatically replayed."),
        React.createElement("details", { style: { marginTop: '.6rem' } },
            React.createElement("summary", { style: { cursor: 'pointer' } }, "Shareable metadata"),
            React.createElement("pre", { style: { whiteSpace: 'pre-wrap', fontSize: '.8rem' } }, JSON.stringify(report, null, 2))))));
}
