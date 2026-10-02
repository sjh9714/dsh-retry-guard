# Contributing

Keep changes focused on repeated identical tool failures in DSH Web 0.2.0-rc.2.
This validation alpha is waiting for five installation trials before adding
features. Installation fixes and reproducible correctness bugs are welcome.

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

An installation trial is useful even without a code contribution. Follow
[the trial instructions](docs/trial.md) and update the same issue after 48 hours.
Participation is optional; no telemetry or automatic follow-up is enabled.
