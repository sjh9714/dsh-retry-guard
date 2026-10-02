# Verification record

Checked **2026-10-02, Asia/Seoul** for the local **0.1.0-alpha.1** prototype.
This records local behavior, not a public release or real-user adoption.

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

## Not verified

Other DSH versions, operating systems/browsers, provider-specific live models,
programmatic tool-call nesting, and a full ecosystem of third-party plugins are
outside this check. These tests do not prove compatibility with every tool.
The runtime detector resets on host/plugin restart and does not reconstruct a
pause latch from history. No guarantee is made about cancelling already-running
parallel work.

The five-person installation and 48-hour retention trial has not started. No
npm package, versioned release, community post or awesome-list PR has been
published. Feature expansion remains gated on the [trial](trial.md).
