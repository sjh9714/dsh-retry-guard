# Contributing

Keep changes focused on repeated identical tool failures in DSH Web 0.2.0-rc.2.
We are building in public. Installation fixes, reproducible correctness bugs
and scoped proposals grounded in an actual workflow are welcome. Describe the
problem and expected behavior in an issue before starting a larger feature.

Use Node.js 24 and pnpm 11.24.0:

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm demo
```

For runtime behavior changes, add a focused regression test. The adapter tests
run the actual DSH loop with a scripted model and no API key. For browser changes,
follow the Web checks in the README and verify the visible report and settings.
Commit the rebuilt `lib/` alongside source; CI checks that they match.

Explain the problem, resulting behavior and verification in your pull request.
Do not include access tokens, `.work`, full session exports or private prompts.
Generated local evidence in `artifacts/` is deliberately excluded from Git.

Installation and usage feedback is useful even without a code contribution.
Follow [the feedback guide](docs/trial.md); a later update on continued use helps.
Participation is optional; no telemetry or automatic follow-up is enabled.
