export interface Outcome {
    turn: number;
    toolName: string;
    arguments: unknown;
    failure?: unknown;
    callId: string;
    rootCallId: string;
    time: number;
}
export interface Detection {
    turn: number;
    toolName: string;
    failureCount: number;
    firstSeenAt: string;
    detectedAt: string;
    firstCallId: string;
    lastCallId: string;
    firstRootCallId: string;
    lastRootCallId: string;
}
export declare class FailureTracker {
    private chain?;
    private readonly failureLimit;
    private readonly excluded;
    constructor(failureLimit?: number, excludeTools?: readonly string[]);
    observe(outcome: Outcome): Detection | undefined;
    reset(): void;
}
