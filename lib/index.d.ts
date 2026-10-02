import type { Context, Volatile } from '@deepseek-ai/cordis';
import type { ContextFormed } from '@deepseek-ai/dsh-llm';
import type { Detection } from './core.ts';
export interface Options {
    mode?: 'observe' | 'pause';
    failureLimit?: number;
    excludeTools?: string[];
}
export interface Config {
    mode: Volatile<'observe' | 'pause'>;
    failureLimit: Volatile<number>;
    excludeTools: Volatile<string[]>;
}
declare module '@deepseek-ai/dsh-llm' {
    interface MessageSourceMap {
        'dsh-retry-guard': {
            kind: 'dsh-retry-guard';
            report?: GuardReport;
        } & ContextFormed;
    }
}
export interface GuardReport extends Detection {
    schemaVersion: 1;
    sessionId: string;
    mode: 'observe' | 'pause';
    action: 'observed' | 'paused';
    resultRefs: {
        seq: number;
        callId: string;
    }[];
}
import z from '@deepseek-ai/schemastery';
export declare const name = "dsh-retry-guard";
export declare const Config: z<Schemastery.ObjectS<NoInfer<{
    mode: z<"observe" | "pause", "observe" | "pause", "volatile-defined">;
    failureLimit: z<number, number, "volatile-defined">;
    excludeTools: z<NoInfer<string[]>, NoInfer<string[]>, "volatile-defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    mode: z<"observe" | "pause", "observe" | "pause", "volatile-defined">;
    failureLimit: z<number, number, "volatile-defined">;
    excludeTools: z<NoInfer<string[]>, NoInfer<string[]>, "volatile-defined">;
}>>, "plain">;
export declare function apply(ctx: Context, config: Config): void;
