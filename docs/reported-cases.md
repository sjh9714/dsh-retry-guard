# Report-inspired checks and coverage limits

Checked **2026-10-02** against **DSH 0.2.0-rc.2**, Node.js 24.

Public reports establish that people have experienced repeated work. The checks
below establish which small failure patterns this plugin handles. They do not
establish adoption, savings, or that every original incident would be stopped.

## What people reported

| Primary report | Reported experience | What we can test here |
| --- | --- | --- |
| [Missing description, #1093](https://github.com/deepseek-ai/deepseek-harness/discussions/1093), Aug 14 | Author reports 53 rejected `run_code` calls out of 73 and asks for a circuit breaker. Another participant reports the same symptom. | Send the same incomplete arguments through DSH's actual `run_code` validator; separately change the code each time. |
| [Bash permissions, #6701](https://github.com/deepseek-ai/deepseek-harness/discussions/6701), Sep 15 | On 0.1.5-rc.1, author reports 11 failed Bash calls despite a repeat warning. The command stayed the same, but justification strings and errors changed. | Exercise today's Bash validation and same-mode permission handling. Do not assume the old errors still exist. |
| [Expired MCP session, #3489](https://github.com/deepseek-ai/deepseek-harness/discussions/3489), Aug 20 | Author reports six MCP errors among 67 calls in one turn and six among 29 in another. | Return the reported JSON-RPC error through the actual MCP client; compare consecutive errors with errors separated by successful calls. |
| [Repeated text, #8581](https://github.com/deepseek-ai/deepseek-harness/discussions/8581), Oct 1 UTC | Author describes repeated promises to check Git status without a tool call. | Emit a bounded repeated text response; confirm that a tool-result detector cannot intervene. |

The counts above are the authors' reports, not our measurements. Original session
archives were not replayed, and the exact ordering of all MCP calls is unknown.
Our interleaving is an illustrative boundary, not a reconstruction of that trace.

## Run without an API key

After the README's development installation:

```sh
pnpm reproduce:reports
pnpm test
```

The first command measures nine scenarios in Disabled, Observe and Pause modes.
It prints counts and writes `artifacts/reported-cases.json` containing only
scenario labels, counts, mode/version and time. It does not export raw arguments,
errors, prompts, local connection URLs or session records.
The `failedCalls` column counts DSH `isError` results, not command exit codes.

The real components are DSH's agent loop, tool registry/schema validation,
result dispatch, session events, Bash tool and sandbox-policy logic, and MCP
client over Streamable HTTP. The model is scripted. OS execution is replaced by
a recording shell stub; no shell commands run. The local MCP server listens on
an ephemeral loopback port and deliberately returns the reported error. It is
not a real expired production session, and this is not a test of all reconnect
or session-expiration paths. `run_code` execution is guarded by a sentinel: the
missing-description cases must fail before program execution.

## Measured results

Calls are bounded at six per repeated scenario. The interleaved case also has
six successful native calls. A completed script makes one final text request;
a paused script never starts that next request.

| Scenario | Disabled: tool calls / model requests | Pause: tool calls / model requests | Interpretation |
| --- | ---: | ---: | --- |
| Identical `run_code`, missing description | 6 / 7 | **3 / 3** | Paused on real schema errors |
| Empty justification requesting wider permissions from read-only | 6 / 7 | **3 / 3** | Paused before any shell execution |
| Identical MCP arguments and JSON-RPC error | 6 / 7 | **3 / 3** | Paused after three actual local MCP requests |
| Already-effective permission, empty justification | 6 / 7 | 6 / 7 | Accepted by current DSH; no error to count |
| Already-effective permission, valid justification | 6 / 7 | 6 / 7 | Accepted by current DSH; no error to count |
| Bash exit code 1 | 6 / 7 | 6 / 7 | DSH returns a normal tool result, not `isError` |
| Six MCP errors interleaved with successes | 12 / 13 | 12 / 13 | Each success resets the streak |
| Missing description, different code each time | 6 / 7 | 6 / 7 | Changed arguments reset the streak |
| Repeated text, no tool call | 0 / 1 | 0 / 1 | Outside the detector; fixture finishes on its own |

Observe retains the Disabled counts and adds one notice in each of the first
three scenarios. Pause adds one notice there. The remaining scenarios emit no
guard notices in either mode. Tests also verify that all original tool results
survive, private fixture markers stay out of notices, and a new human message
admits a successful repaired native call without replaying the failed call.

## What changed our assessment

The Bash report's original same-mode failures do **not** reproduce on the pinned
version: current DSH accepts that permission request with either justification.
The empty-justification rejection in our positive case requires a different
starting policy, `read-only`. It is a related validation case, not a reproduction
of the old full-access incident. This matches the pinned upstream
[Bash validator](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.0-rc.2/packages/shell/tool-bash/src/index.ts)
and [sandbox rules](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.0-rc.2/packages/sandbox/sandbox/src/index.ts).

The nonzero-exit case is another material limit: this plugin follows DSH's
`isError` flag. A failed build or test command can return exit code 1 inside a
normal tool result. It will **not** be stopped by this plugin merely because the
command failed. The pinned
[Bash renderer](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.0-rc.2/packages/shell/tool-bash/src/render.ts)
and fixture confirm this distinction.

There was no detector defect within its existing contract in these checks, so
production behavior was not expanded. The strongest supported use is a repeated,
unchanged validation or MCP tool error. Broader loop protection remains a
different policy. The [alternatives](alternatives.md) may fit that need better.

The next unanswered question is whether users encounter this exact narrow
pattern often enough to keep the plugin installed. The [five-person trial](trial.md)
has not started; technical reproduction does not replace that gate. We have not
run live paid models, replayed the original sessions, or rerun the Web installation
matrix for these new test-only fixtures. Prior Web checks are recorded in
[verification](verification.md).
