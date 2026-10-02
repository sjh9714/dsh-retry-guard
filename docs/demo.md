# Developer setup and keyless demo

This guide is for running the repository's scripted demonstration or changing
its source. **It is not required to install or use the plugin.** For a normal
DSH installation, follow the [user guide](../README.md#install-in-your-dsh-web).
The released plugin archive does not contain this demo's model or tool.

## Set up a source checkout

Use Node.js 24 and pnpm 11.24.0. All DSH packages are pinned to 0.2.0-rc.2.

```sh
git clone https://github.com/sjh9714/dsh-retry-guard.git
cd dsh-retry-guard
pnpm install --frozen-lockfile
pnpm check
```

No dependency lifecycle scripts are needed for the detector tests. Installing
dependencies needs registry access; the scripted model needs no API key.

## Terminal demonstration

```sh
pnpm demo
pnpm reproduce:reports
```

`pnpm demo` uses the actual DSH loop with a scripted model and a deliberately
failing local tool. It writes `artifacts/demo-results.json`.

| Configuration | Tool calls | Model requests before completion/pause |
| --- | ---: | ---: |
| Guard not mounted | 6 | 7 |
| Observe (default) | 6 | 7 |
| Pause | 3 | 3 |

A new human instruction then permits one repaired successful call. These are
counts from one deterministic fixture, not a general cost or token-saving claim.
`pnpm reproduce:reports` exercises the real DSH validators and a local MCP
transport using a scripted model and stub shell; see [scope](reported-cases.md).

## Web demonstration

```sh
pnpm demo:web
```

Open the local URL printed in the terminal and accept DSH's welcome notice.
This command packs and installs the local source build in `.work/demo-home`.
It does not use your normal DSH home and disables paid model routes in its own
overlay. The fixture makes no network, shell or file calls.

1. Open **Plugins → dsh-retry-guard → dsh-retry-guard (Configure)**.
2. Select **Pause**, keep the failure limit at **3**, and click **Save settings**.
3. Start **New Session**. In the model picker, choose **Local fixture · no API key**.
4. Send `run fixture`. The tool fails three times, then the next model step stops.
5. Inspect the Retry Guard report and the original error as described below.
6. Return to **Chat** and send `fixture repair`. The fixture performs one new
   successful call. This special phrase belongs to the demo; in real work,
   correct the cause yourself and send your own instruction.

Press Ctrl+C in the terminal to stop the server. Do not share the access token
in its URL, browser storage, or full session exports.

## Inspect the original error

The report's event and call references identify the original records in the
same conversation. The shareable report intentionally omits raw error text and
arguments; those remain in DSH's original history.

Open the conversation's **Trajectory** tab and find the failed **TOOL** row in
the stopped turn. Select that row; its inspector shows **Status: Failed** and
the original error under **Result**. In this demo the error says the resource is
unavailable. Return to **Chat** to send your repair instruction. The report currently has no direct inspector
button; record references are plain text.

In DSH 0.2.0-rc.2, the native `inspectCall` callback is supplied to the conversation
view and tool-node slots, but not to `conversation.chat.turnTail`, where this
plugin's report is rendered. A direct link is deferred until a supported route
is available for this slot. The plugin does not replace DSH's conversation shell
or depend on DOM selectors to navigate the user's UI.

## Build and verify changes

```sh
pnpm test
pnpm typecheck
pnpm build
pnpm pack --pack-destination artifacts
```

For repeatable Web checks, start:

```sh
mkdir -p .work
pnpm demo:web > .work/demo-web.log 2>&1
```

In another terminal:

```sh
pnpm test:web
```

The Web check needs Playwright Chromium. If missing, install it explicitly with
`pnpm exec playwright install chromium`. It checks Observe, Pause, saved settings,
resumption and original-event preservation in the disposable demo profile.
Optional `pnpm demo:record` also needs ffmpeg and records the actual Web UI using
the saved test browser state. Do not upload files from `.work`.
