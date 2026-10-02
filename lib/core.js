export class FailureTracker {
    chain;
    failureLimit;
    excluded;
    constructor(failureLimit = 3, excludeTools = []) {
        if (!Number.isSafeInteger(failureLimit) || failureLimit < 2) {
            throw new RangeError('failureLimit must be an integer of at least 2');
        }
        this.failureLimit = failureLimit;
        this.excluded = new Set(excludeTools);
    }
    observe(outcome) {
        if (outcome.failure === undefined || this.excluded.has(outcome.toolName)) {
            this.reset();
            return;
        }
        // Keep only a digest in memory. Raw arguments/errors never enter a report.
        const key = createHash('sha256').update(canonical([
            outcome.turn, outcome.toolName, outcome.arguments, outcome.failure,
        ])).digest('hex');
        const previous = this.chain;
        const count = previous?.key === key ? Math.min(previous.count + 1, this.failureLimit + 1) : 1;
        const first = previous?.key === key ? previous.first : {
            turn: outcome.turn, toolName: outcome.toolName, callId: outcome.callId,
            rootCallId: outcome.rootCallId, time: outcome.time,
        };
        this.chain = { key, count, first };
        if (count !== this.failureLimit)
            return;
        return {
            turn: outcome.turn, toolName: outcome.toolName, failureCount: count,
            firstSeenAt: new Date(first.time).toISOString(), detectedAt: new Date(outcome.time).toISOString(),
            firstCallId: first.callId, lastCallId: outcome.callId,
            firstRootCallId: first.rootCallId, lastRootCallId: outcome.rootCallId,
        };
    }
    reset() { this.chain = undefined; }
}
/** JSON object key order is irrelevant; array order and exact text are not. */
function canonical(value) {
    if (Array.isArray(value))
        return `[${value.map(canonical).join(',')}]`;
    if (value !== null && typeof value === 'object') {
        const record = value;
        return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${canonical(record[key])}`).join(',')}}`;
    }
    const json = JSON.stringify(value);
    if (json === undefined)
        throw new TypeError('Expected JSON-serializable tool data');
    return json;
}
import { createHash } from 'node:crypto';
