# DSH Retry Guard

Pause before the next model step after three identical DSH tool errors.

![Three identical failures pause the next step; a new instruction resumes after repair.](docs/assets/demo.gif)

[20-second recording](docs/assets/demo.mp4): real DSH Web, **scripted model**, no API key.
The demonstration uses a deliberately failing local tool, not a production AI model.

[Build the local archive](#install-and-try), then install it:

```sh
dsh plugin --profile web add ./artifacts/dsh-retry-guard-0.1.0-alpha.1.tgz
```

**Supported target: DSH Web 0.2.0-rc.2 · Node.js 24.** Early prototype, MIT.
Unofficial community plugin; independently maintained and not endorsed by DeepSeek.
**Default: observe. Opt-in: pause.** The plugin requires no separate account,
API key or network connection. Installing dependencies requires registry access.

## Install and try

There is no npm release yet. With Node.js 24 and pnpm 11.24.0, clone this
repository, build the archive and install it into your DSH Web profile:

```sh
git clone https://github.com/sjh9714/dsh-retry-guard.git
cd dsh-retry-guard
pnpm install --frozen-lockfile
pnpm check
pnpm pack --pack-destination artifacts
dsh plugin --profile web add ./artifacts/dsh-retry-guard-0.1.0-alpha.1.tgz
```

Restart DSH Web after a CLI installation. In **Plugins**, open the installed
`dsh-retry-guard` bundle, then its **dsh-retry-guard component** (Configure).
Choose **Pause** and **Save settings** when ready. Installation starts in Observe.
The package contains built JavaScript and a `dsh.bundle` manifest pointing to
`cordis.patch.yml`; `dsh.bundle` is a package manifest field, not a separate file
extension. Installing the archive does not build source on your machine.

For an isolated demo using the pinned DSH version from this repository:

```sh
pnpm demo       # terminal comparison; writes artifacts/demo-results.json
pnpm demo:web   # opens a local server URL in the terminal; no model API key
```

Open the printed local URL and accept DSH's welcome notice. Set Retry Guard to
Pause as above. Start **New Session**, select **Local fixture · no API key** from
the model picker, then send `run fixture`. After three failures, inspect the
Retry Guard report. Send `fixture repair` to exercise a successful new call.

The Web demo uses `.work/demo-home`, independently of your usual DSH home, and
disables paid model routes in its own overlay. The fixture makes no network,
shell or file calls. Press Ctrl+C in its terminal to stop it. Do not share the
access token in its local URL.

The same terminal script gives these measured counts:

| Configuration | Tool calls | Model requests before completion/pause |
| --- | ---: | ---: |
| Guard not mounted | 6 | 7 |
| Observe (default) | 6 | 7 |
| Pause | 3 | 3 |

A new human instruction then permits one repaired successful call. These are
counts from one deterministic fixture, not a general cost or token-saving claim.
See [verification scope](docs/verification.md) and [alternatives](docs/alternatives.md).

Public users have reported repeated missing-argument and MCP errors. We tested
small cases through DSH's actual validators and MCP client, including cases the
guard cannot stop. See [reports, measured results and limits](docs/reported-cases.md),
or run `pnpm reproduce:reports` without an API key.

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

```sh
pnpm test       # Node test runner; real DSH loop, scripted model
pnpm reproduce:reports # real validators/MCP client; scripted model, stub shell
pnpm typecheck
pnpm build     # distributable lib/ + declarations
pnpm test:web  # with pnpm demo:web running; requires Playwright Chromium
```

For repeatable Web checks, start `pnpm demo:web > .work/demo-web.log 2>&1` after
creating `.work`. Browser installation, if needed, is the explicit command
`pnpm exec playwright install chromium`. Optional `pnpm demo:record` also needs
ffmpeg and records the actual Web UI, using the saved test browser state.

The detector is in `src/core.ts`; the DSH adapter and durable notice are in
`src/index.ts`; settings and the visible report are in `src/client/index.tsx`.
Dependencies are pinned in `pnpm-lock.yaml`.
No dependency lifecycle scripts are needed for the detector tests.
The [Check workflow](https://github.com/sjh9714/dsh-retry-guard/actions/workflows/ci.yml)
runs type checks, tests, the build and both keyless terminal examples on Node.js 24.

This is a validation alpha. We are looking for five DSH Web users to try installing
it and report whether they still use it after 48 hours. See the
[five-person trial](docs/trial.md) for the steps and a public feedback form.
Feature expansion and a broader launch wait until at least three people install
within five minutes and confirm continued use. Stars and downloads do not count
as installation or retention evidence.
