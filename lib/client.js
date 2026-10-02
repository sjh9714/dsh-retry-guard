window.__ModuleLoader__.load({id:"dsh-retry-guard",factory:(require)=>{
var module={exports:{}};var exports=module.exports;
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.inject = void 0;
exports.apply = apply;
const react_1 = __importStar(require("react"));
exports.inject = ['slots'];
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
    const [draft, setDraft] = (0, react_1.useState)();
    const [busy, setBusy] = (0, react_1.useState)(false);
    const [status, setStatus] = (0, react_1.useState)('');
    const [failed, setFailed] = (0, react_1.useState)(false);
    if (view === 'summary')
        return 'Observe repeated failures, or pause before the next model step.';
    if (!form || form.state.status !== 'ready')
        return react_1.default.createElement("p", { role: "status" }, "Waiting for Retry Guard settings\u2026");
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
    return react_1.default.createElement("form", { className: "retry-guard-form", onSubmit: save },
        react_1.default.createElement("style", null, css),
        react_1.default.createElement("fieldset", { disabled: busy || !form.state.writable },
            react_1.default.createElement("label", { htmlFor: "retry-guard-mode" },
                "Mode",
                react_1.default.createElement("select", { id: "retry-guard-mode", value: values.mode, onChange: e => edit({ mode: e.target.value }) },
                    react_1.default.createElement("option", { value: "observe" }, "Observe \u2014 show a notice and keep working"),
                    react_1.default.createElement("option", { value: "pause" }, "Pause \u2014 stop before the next model step")),
                react_1.default.createElement("small", null, "Pausing lets running tools finish. Send a new instruction after fixing the cause to continue.")),
            react_1.default.createElement("label", { htmlFor: "retry-guard-limit" },
                "Consecutive failure limit",
                react_1.default.createElement("input", { id: "retry-guard-limit", type: "number", min: "2", step: "1", required: true, value: values.limit, onChange: e => edit({ limit: e.target.value }) }),
                react_1.default.createElement("small", null, "The tool, normalized arguments and failure content must all match.")),
            react_1.default.createElement("label", { htmlFor: "retry-guard-excluded" },
                "Excluded tools",
                react_1.default.createElement("textarea", { id: "retry-guard-excluded", placeholder: "One exact tool name per line", value: values.excluded, onChange: e => edit({ excluded: e.target.value }) }),
                react_1.default.createElement("small", null, "Excluded calls break the failure streak. Wildcards are not supported."))),
        react_1.default.createElement("div", { className: "retry-guard-actions" },
            react_1.default.createElement("button", { type: "submit", disabled: busy || !draft || !form.state.writable }, busy ? 'Saving…' : 'Save settings'),
            react_1.default.createElement("button", { type: "button", disabled: busy, onClick: () => { setDraft(undefined); setFailed(false); setStatus('Loaded saved settings.'); } }, "Reload saved settings")),
        react_1.default.createElement("p", { className: "retry-guard-status", role: failed ? 'alert' : 'status' }, status));
}
function apply(ctx) {
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
    const contexts = (0, react_1.useSyncExternalStore)(source.subscribe, source.getSnapshot);
    const reports = contexts.flatMap(context => {
        const source = context.source;
        return source?.kind === 'dsh-retry-guard' && source.report?.schemaVersion === 1
            ? [{ seq: context.seq, report: source.report }] : [];
    });
    if (!reports.length)
        return null;
    return react_1.default.createElement(react_1.default.Fragment, null, reports.map(({ seq, report }) => react_1.default.createElement("section", { key: seq, "aria-label": "Retry Guard report", style: {
            border: '1px solid #9399a4', borderLeft: '4px solid #b88318', borderRadius: 8,
            padding: '1rem 1.25rem', margin: '.75rem 0', lineHeight: 1.6, overflowWrap: 'anywhere',
        } },
        react_1.default.createElement("strong", null,
            "Retry Guard ",
            report.action,
            ": ",
            report.toolName,
            " failed ",
            report.failureCount,
            " times"),
        react_1.default.createElement("p", { style: { margin: '.45rem 0' } }, report.action === 'paused'
            ? 'The next model step was paused. Inspect the original failure, fix the cause, then send a new instruction.'
            : 'Observation only. The agent was allowed to continue.'),
        react_1.default.createElement("small", null,
            react_1.default.createElement("time", { dateTime: report.detectedAt }, report.detectedAt),
            " \u00B7 Same tool, arguments and failure."),
        react_1.default.createElement("p", { style: { margin: '.45rem 0' } },
            "Original records: open ",
            react_1.default.createElement("b", null, "Trajectory"),
            " and inspect ",
            report.resultRefs.length
                ? report.resultRefs.map(ref => `event #${ref.seq} (call ${ref.callId})`).join(', ')
                : `call ${report.lastCallId}`,
            "."),
        react_1.default.createElement("small", null, "Running parallel calls may finish. Failed calls are never automatically replayed."),
        react_1.default.createElement("details", { style: { marginTop: '.6rem' } },
            react_1.default.createElement("summary", { style: { cursor: 'pointer' } }, "Shareable metadata"),
            react_1.default.createElement("pre", { style: { whiteSpace: 'pre-wrap', fontSize: '.8rem' } }, JSON.stringify(report, null, 2))))));
}

return module.exports;}});
