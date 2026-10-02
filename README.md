# DSH Retry Guard

Pause before the next model step after three identical DSH tool errors.

![Three identical failures pause the next step; a new instruction resumes after repair.](https://raw.githubusercontent.com/sjh9714/dsh-retry-guard/main/docs/assets/demo.gif)

[20-second recording](https://github.com/sjh9714/dsh-retry-guard/blob/main/docs/assets/demo.mp4): real DSH Web, **scripted model**, no API key.
The demonstration uses a deliberately failing local tool, not a production AI model.

In DSH, open **Plugins → Add plugin**, enter this package name, click **Install**, then
**Enable now**:

```text
dsh-retry-guard@alpha
```

**Supported target: DSH Web 0.2.0-rc.2 · Node.js 24.** Early prototype, MIT.
Unofficial community plugin; independently maintained and not endorsed by DeepSeek.
**Default: observe. Opt-in: pause.** The plugin requires no separate account,
API key or network connection. Installing dependencies requires registry access.

## Real problems, tested boundaries

If DSH keeps submitting the **same invalid tool call**, Pause mode gives you a
stopping point to inspect and fix it. Users have reported this with missing
arguments, invalid edits and unavailable tools. A reminder alone did not stop
the retries in some of those reports.

We inspected seven public reports and tested their relevant failure patterns on
**DSH 0.2.0-rc.2, 2026-10-02**. The counts below are **our bounded experiments**,
not measurements of the original users' sessions.

| Public report | What we verified | Result with Pause |
| --- | --- | --- |
| [Missing `run_code` description, #1093](https://github.com/deepseek-ai/deepseek-harness/discussions/1093): author reports 53 rejected calls | Identical incomplete arguments through DSH's real schema validator | **6 → 3 calls**; changing the code each time is not caught |
| [Invalid Edit retries, #6370](https://github.com/deepseek-ai/deepseek-harness/discussions/6370#discussioncomment-18407743): old and new strings were identical | DSH's real `edit` validator rejects the repeated edit before file access | **6 → 3 calls**; no files accessed |
| [Empty tool name, #4370](https://github.com/deepseek-ai/deepseek-harness/discussions/4370): repeated unknown-tool failures | Repeated empty names through DSH's tool registry | **6 → 3 calls**; the old streaming-parser bug itself was not replayed |
| [Expired MCP session, #3489](https://github.com/deepseek-ai/deepseek-harness/discussions/3489): repeated session errors | Real MCP client against a local server returning the reported JSON-RPC error | **6 → 3 calls** when consecutive; successes between errors reset the count |
| [Bash permission loop, #6701](https://github.com/deepseek-ai/deepseek-harness/discussions/6701) | The reported same-mode permission requests are accepted by the current version | **Old failure did not reproduce**; a related invalid escalation does pause |
| [Promises without calls, #8581](https://github.com/deepseek-ai/deepseek-harness/discussions/8581) | Bounded repeated assistant text, no tool execution | **Not detected** |
| [Tool markup returned as text, #8509](https://github.com/deepseek-ai/deepseek-harness/discussions/8509) | Synthetic tool-looking markup in an ordinary text response | **Not detected**; no native tool result reaches the guard |

These checks use a **scripted model**, real DSH validators/agent loop, and a local
MCP protocol fixture. They require no API key. They do not replay original
sessions or prove production savings. In the caught cases, model requests also
fall from 7 to 3; Observe keeps all 6 calls and adds a notice.

This guard is for identical consecutive **tool errors**. Successful repeated
searches, ordinary Bash exit-code failures, changing calls and text loops need a
different approach. See [all 12 scenarios, methodology and reproduction instructions](https://github.com/sjh9714/dsh-retry-guard/blob/main/docs/reported-cases.md).

## Install in your DSH Web

Requires an existing **DSH Web 0.2.0-rc.2** installation on **Node.js 24**.
The released archive contains built JavaScript. You do not need Git, pnpm, a
source checkout, or a build to install it. The `alpha` tag selects the current
prerelease. To pin this version, enter `dsh-retry-guard@0.1.0-alpha.2`.

1. Open **Plugins → Add plugin**. Enter `dsh-retry-guard@alpha` into
   **Package name or address** and click **Install**.
2. Wait for the installed screen, then click **Enable now**. Installing the
   files alone does not enable the plugin. Keep this screen open until enabled.
3. In **Plugins**, open the **dsh-retry-guard** bundle, then its
   **dsh-retry-guard** component (**Configure**).
4. Leave **Observe** selected to see notices while work continues. To stop
   repeated failures, choose **Pause** and click **Save settings**.
5. Continue working in your normal DSH conversation. You do not need to invoke
   Retry Guard with a command.

See [verification scope](https://github.com/sjh9714/dsh-retry-guard/blob/main/docs/verification.md) for the installation checks.

### Terminal installation

```sh
dsh plugin --profile web add dsh-retry-guard@alpha
```

Restart DSH Web after a CLI installation, then open the settings as above.
Use DSH's plugin manager to install and activate the bundle; a plain
`npm install` in an unrelated project does not activate it in DSH.

### GitHub download alternative

The earlier [alpha.1 archive](https://github.com/sjh9714/dsh-retry-guard/releases/tag/v0.1.0-alpha.1)
remains available with identical detector, host and browser code. Download its
`.tgz` and `SHA256SUMS`, then install it from the download directory:

```sh
dsh plugin --profile web add ./dsh-retry-guard-0.1.0-alpha.1.tgz
```

The archive's `dsh.bundle` manifest points to `cordis.patch.yml`; this is a
package manifest field, not a separate file extension. DSH 0.2.0-rc.2 does not
automatically update installed plugins. To switch versions, uninstall the old
bundle and install the desired version, then check its saved mode.

## What happens when a failure repeats?

For example, a tool repeatedly returns the same missing-argument error with the
same arguments. On the third consecutive failure:

- **Observe:** work continues and a Retry Guard notice appears when the turn ends.
- **Pause:** the next model step does not start. The notice shows the failed tool,
  count, time, and original event/call references.
- **After repair:** inspect the original failure in **Trajectory**, fix the cause,
  then send a new instruction in **Chat**. Failed calls are not replayed automatically.

The plugin notices a repeated error; it does not work out or fix its cause.
The notice currently gives record references, not a one-click inspector link.
See the [error-record walkthrough](https://github.com/sjh9714/dsh-retry-guard/blob/main/docs/demo.md#inspect-the-original-error).

You can watch the recording above without installing development tools. To run
our exact keyless demonstration yourself, follow the separate
[developer demo guide](https://github.com/sjh9714/dsh-retry-guard/blob/main/docs/demo.md). Its scripted model and failing tool belong
to the source checkout and are not included in the normal plugin installation.

In that one deterministic fixture, Observe runs 6 tool calls / 7 model requests;
Pause runs 3 / 3, followed by one successful call after a new repair instruction.
These are fixture counts, not a general cost-saving claim. See
[verification scope](https://github.com/sjh9714/dsh-retry-guard/blob/main/docs/verification.md), [alternatives](https://github.com/sjh9714/dsh-retry-guard/blob/main/docs/alternatives.md),
and [reported failures and detection limits](https://github.com/sjh9714/dsh-retry-guard/blob/main/docs/reported-cases.md).

## Behavior

Within one agent and turn, three consecutive failed calls must have the same
tool name, recursively key-sorted JSON arguments, and exact failure content.
"Failed" means DSH marks the tool result `isError: true`. A Bash command returning
exit code 1 is normally a successful tool execution in DSH and is **not counted**.
Array order, strings, and failure details are significant. A successful call,
changed arguments/error/tool, an excluded call, or a new turn breaks the chain.
Excluded names are exact matches, not wildcards.

- **Observe:** add one source-attributed notice per uninterrupted failure streak.
- **Pause:** also reject the next model step. Already-running parallel calls can
  still finish. This does not guarantee a maximum of three executions per batch.
- **Continue:** inspect the original tool results, correct the cause, and send a
  new instruction. The plugin never automatically replays a failed call.
- **Evidence:** the notice includes count, tool, timestamp, session/call IDs and
  original event sequence references. The Web report appears below the completed
  turn; use **Trajectory** to inspect the cited calls. Original results remain unchanged.

Configuration has exactly three fields:

```yaml
mode: observe       # observe | pause
failureLimit: 3     # integer >= 2
excludeTools: []    # exact names; excluded calls break a streak
```

Changes start a fresh detector state at the next boundary. Detector state is
in memory and resets when the plugin or host restarts. Existing notices and
tool records remain in the DSH session. A fresh human message also resets an
armed pause, including messages queued while tools finish.

## Privacy and limits

The guard performs no network requests and has no telemetry. It hashes raw
arguments/failure content only in memory. The notice's shareable JSON includes
metadata only: no arguments, error text, authentication values, or conversation
text. Review tool names and identifiers before sharing. DSH's original session
log still contains the original tool data; do not confuse a full session export
with this small report.

Different errors, changing arguments, interleaved calls, pure text loops and
provider request failures are outside this detector's narrow rule. Successful
polling is not blocked. Other plugins may independently stop work. The plugin
does not diagnose a root cause, repair files, switch models, or estimate savings.

Only DSH Web 0.2.0-rc.2 is targeted. Other versions require compatibility tests.
The exact DSH peer declarations identify the tested API versions; package-manager
warnings alone are not a compatibility test. DSH's profile installer may warn
about peers that its host supplies; the isolated Web install is tested separately.

## Remove

Stop the DSH Web process for the profile, then run:

```sh
dsh plugin --profile web remove dsh-retry-guard
```

Restart DSH Web. Existing session records remain. For the isolated demo only,
prefix the command with `DSH_HOME="$PWD/.work/demo-home"` and use `pnpm exec dsh`
if the CLI is not globally installed. Do not delete your normal DSH home.
DSH retains the dormant settings row in the profile patch; removing the bundle
unloads its hooks and UI. Reinstalling into that same profile can reuse the saved
mode, so check it before starting work.

## Development

See [developer setup, keyless demo and Web checks](https://github.com/sjh9714/dsh-retry-guard/blob/main/docs/demo.md).

The detector is in `src/core.ts`; the DSH adapter and durable notice are in
`src/index.ts`; settings and the visible report are in `src/client/index.tsx`.
Dependencies are pinned in `pnpm-lock.yaml`.
No dependency lifecycle scripts are needed for the detector tests.
The [Check workflow](https://github.com/sjh9714/dsh-retry-guard/actions/workflows/ci.yml)
runs type checks, tests, the build and both keyless terminal examples on Node.js 24.

This is a validation alpha. We are looking for five DSH Web users to try installing
it and report whether they still use it after 48 hours. See the
[five-person trial](https://github.com/sjh9714/dsh-retry-guard/blob/main/docs/trial.md) for the steps and a public feedback form.
The [DSH community invitation](https://github.com/deepseek-ai/deepseek-harness/discussions/8628)
has the demo and participation details.
Feature expansion and a broader launch wait until at least three people install
within five minutes and confirm continued use. Stars and downloads do not count
as installation or retention evidence.
