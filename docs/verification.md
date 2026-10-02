# Verification record

Checked **2026-10-02, Asia/Seoul** for the local **0.1.0-alpha.1** prototype.
This records technical verification, including the public alpha archive below.
It does not establish real-user adoption.

## Environment and evidence

- macOS 26.3.1, arm64; Node 24.19.0; pnpm 11.24.0.
- DSH Web and SDK packages pinned to 0.2.0-rc.2; Cordis 4.0.4.
- Chromium 151.0.7922.34 through Playwright 1.62.1.
- Browser tests use the packaged plugin in an isolated DSH profile. The model is
  a deterministic local adapter. The tool performs no file, shell or network I/O.
- `artifacts/demo-results.json`, `artifacts/verification/web-results.json` and
  `artifacts/verification/lifecycle-results.json` hold fresh local measurements.
  These generated files are ignored by Git. Access URLs and browser auth state
  stay under ignored `.work`; they are not release assets.

## Checks

| Contract | Evidence |
| --- | --- |
| Three identical failures prevent the fourth model request | Actual DSH loop integration test and Web session log: 3 results, 3 steps, blocked turn |
| Default observation continues | Loop and Web fixture: 6 failed calls, 7 model requests, one guard notice |
| Success and changed inputs do not accumulate failures | Core reset/normalization tests; six successful polls continue in the real loop |
| Agents stay independent | Two agents in one real DSH context; only the agent reaching the limit pauses |
| New human input resumes | Live Web: one repaired success after `fixture repair`, no automatic failed-call replay |
| Claimed messages survive a rejected step | Integration tests preserve queued human and non-human messages; downstream rejection is respected |
| Running batches may finish | One model response dispatches four calls; all finish, next model request is rejected |
| Original records are preserved | Web compares the persisted event prefix before and after resumption; all original events match |
| Reports omit raw payload | Tests use secret-like argument/error/prompt markers and assert none enters the guard notice or source metadata |
| Settings work in the actual UI | Save three fields, reject limit 1, reload saved limit 3, reload page and read back Pause |
| Reason is visible in Chat | A completed-turn contribution displays the durable report; the generic context notice alone is hidden by DSH's default Chat view |
| Final archive installs into a fresh profile | Clean DSH_HOME; installed host/detector/browser bytes match the build; the full Web flow passes again without browser errors |
| Restart preserves settings/history | Stop and start the same profile; six session file hashes and configuration match; historical session and report reopen |
| Removal unloads the guard | DSH CLI remove; absent from bundle manifest and plugin UI; fresh fixture runs six calls and emits no guard notice |
| Removal preserves history/configuration | Original compressed session data matches the saved SHA-256 prefixes; unrelated profile configuration is unchanged |

DSH appended `session/end-seed` while restoring one viewed session. This is a new
event after the unchanged original data, not byte-for-byte equality of the whole
file after viewing. The CLI leaves the dormant guard configuration row in place;
it does not keep the plugin running. Existing notices stay in the durable log;
the custom Chat report renderer is unavailable while the plugin is removed.

The 20-second [recording](assets/demo.mp4) captures actual Web actions. Its model
and tool are scripted; there is no claim about production-model economics.
The [GIF](assets/demo.gif) is a smaller rendition of the same recording.

Locally tested archive SHA-256 (before the GitHub installation guide update):
`c0de202087548f140256049e15c7b77100e991c1d75c1ca4bac1fed266c5c920`.
The archive contains built host/browser code, declarations, bundle patch,
manifest, README and license. It excludes test profiles, session logs, credentials
and browser storage. The source checkout contains the demo media and development
fixtures separately.

Publication preparation added repository metadata, alpha publish defaults, CI and
public issue forms. The 15 tests, typecheck, build and terminal fixture were run
again; npm publish dry-run accepted the 11-file archive. A fresh profile install
contains byte-identical runtime files to the Web-tested build. For the checks on
the published revision, consult the repository's
[GitHub Actions runs](https://github.com/sjh9714/dsh-retry-guard/actions/workflows/ci.yml).
The browser and lifecycle checks above were performed locally on macOS; the CI
workflow covers the type checks, build, detector/loop tests and terminal fixture.

## Reproduce

The [report-inspired checks](reported-cases.md) add nine integration tests and
nine scenarios in three modes through real DSH validators, Bash permission
handling and a local MCP transport. Run `pnpm reproduce:reports` for fresh
aggregate measurements. These fixtures use a scripted model and a stub shell;
they do not replay the original user sessions. The production implementation
and committed runtime files were unchanged by this validation work.

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm demo
mkdir -p .work
pnpm demo:web > .work/demo-web.log 2>&1
```

In another terminal, run `pnpm test:web`. It needs Playwright Chromium installed
and only reads/writes the isolated demo home. `pnpm demo:record` additionally
needs ffmpeg. For install/restart/remove, use an isolated `DSH_HOME`, preserve a
copy or digest of its configuration and session files, stop Web before CLI
changes, then open Web and exercise the core behavior after each change.

## Public alpha archive

[v0.1.0-alpha.1](https://github.com/sjh9714/dsh-retry-guard/releases/tag/v0.1.0-alpha.1)
was published as a GitHub prerelease on **2026-10-02 at 04:51 UTC** from
`d0ea1fd989efd3524c9e946782b961c770118a49`. That revision's GitHub CI passed
all 24 tests, the build, both keyless examples and distribution consistency.

The 11-file archive has SHA-256:
`517ecd9d8acdca2e35f0c0187e73766c106d7327b9ca437d4fc7f7e831849464`.
Its built runtime is unchanged from the earlier Web/lifecycle-tested build.
We downloaded the public archive and checksums without authentication, checked
the bytes against the upload, and installed it into a new isolated DSH home.

The actual Web flow passed at **04:58 UTC**: Observe produced 6 tool calls and
7 model steps; Pause produced 3 calls and 3 steps; new human input admitted one
successful repaired call. Original event records were preserved. Settings
survived page reload, limit 1 was rejected and no browser errors occurred.
The model remains scripted; this is not a production-model benchmark.

The first check exposed a race in the browser verification script: the welcome
overlay appeared after the sidebar, intercepting the first click. The script now
handles that overlay during actionability checks, and the complete Web check
passed. This test-only fix does not change the release archive or plugin runtime.
The isolated verification server was stopped after the check.

## Not verified

Other DSH versions, operating systems/browsers, provider-specific live models,
programmatic tool-call nesting, and a full ecosystem of third-party plugins are
outside this check. These tests do not prove compatibility with every tool.
The runtime detector resets on host/plugin restart and does not reconstruct a
pause latch from history. No guarantee is made about cancelling already-running
parallel work.

The [volunteer invitation](https://github.com/deepseek-ai/deepseek-harness/discussions/8628)
is published, but no completed installation trials or 48-hour retention results
have been recorded. No npm package or awesome-list PR has been published.
Feature expansion remains gated on the [trial](trial.md).

## Installation usability check

On **2026-10-02**, installed the unchanged public alpha.1 archive by pasting its
GitHub Release asset URL into **Plugins → Add plugin → Package name or address**
in a fresh DSH Web 0.2.0-rc.2 profile. Clicked **Install**, waited for **Enable now**,
and enabled it in the same browser flow. The configuration form became available
without restarting Web and showed **Observe** by default.

An earlier interrupted attempt closed the install screen before **Enable now**.
The package files were present but the component remained off and its form waited
for settings. This is why the user guide makes activation a separate required
step; downloading/installing alone is not a successful end-to-end setup.

Ran the existing full browser check against the GUI-installed public artifact.
At **05:40:38 UTC**, it passed Observe (6 tool calls / 7 steps), Pause (3 / 3),
new human instruction → one repaired successful call, unchanged original event
prefix, settings saved across reload and invalid-limit rejection. There were
zero browser errors. Also opened Trajectory, selected a failed TOOL row and
read the original demo error under Result in the native inspector. The model/tool
were local scripted fixtures. This is a
technical installation check by the maintainer, not a five-minute user trial or
48-hour retention result.

The screen installation path follows DSH's pinned
[plugin manager guide](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.0-rc.2/packages/client/ui-plugin-manager/README.md)
and [bundle publishing format](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.0-rc.2/docs/user/develop/basic/publish.md).
These establish official support, not how frequently users choose this method.
No installation-method usage statistics were verified.

The normal installation guide and source-only demo are now separate. No runtime
code or alpha.1 release asset changed. A direct report-to-inspector button remains
unimplemented: the pinned `TurnTailOwnerProps` contract supplies `turn`, `seq`
and `openFile`, while `inspectCall` is on the native view/tool-node contracts.
No supported navigation callback was found for this report slot. The manual
Trajectory route remains documented; compatibility with other DSH versions is
not inferred.
