# Build in public: feedback and distribution

**Direction updated 2026-10-02:** public distribution and development proceed
alongside user feedback. The previous five-person / three-pass launch gate is
retired. Actual use still matters; it is not a prerequisite for publishing work.
No completed external installation or continued-use reports are recorded yet.

## Share what happens

Install from npm using the [README](../README.md), then use Retry Guard in your
normal DSH Web workflow. Feedback is optional and has no participant limit.

- Report an installation problem, a useful catch, a missed repeated failure or a
  false pause through [Issues](https://github.com/sjh9714/dsh-retry-guard/issues/new/choose).
- For installation feedback, include the DSH and plugin versions, approximate
  time to an enabled working setup, and any help needed. Optional developer-demo
  setup time is separate from ordinary installation time.
- If you keep using it, a later update to the same issue after about 48 hours
  helps us understand whether it is useful. Installed-but-unused is distinct
  from continued use; no follow-up means unknown, not a success or failure.
- Do not share API keys, private prompts, raw tool arguments or full session logs.
  Issues are public and linked to your GitHub account. No telemetry is enabled.

Prioritize reproducible installation and correctness problems, then proposals
supported by a concrete workflow. Publish the supporting evidence and limitations
with changes. Stars and downloads are not proof that a feature is useful.

## Public distribution

The repository, npm package, keyless reproduction and 20-second scripted-model
Web demo are available. The [DSH community thread](https://github.com/deepseek-ai/deepseek-harness/discussions/8628)
is the current place to introduce the project and discuss its use.
The package's current published version remains `0.1.0-alpha.2`; installation
uses `dsh-retry-guard@alpha`. Build-in-public messaging does not change the package
version or imply that every DSH version is supported.

Submit one entry to [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md)
once its submission rules are met. The repository was created at
2026-10-02 02:29:17 UTC; its one-day age requirement is met at
**2026-10-03 02:29:17 UTC (11:29:17 Asia/Seoul)**. Review existing entries for overlap
and recheck the rules at submission time. A prepared entry is not an accepted listing.

A short English X post is prepared locally; no X account has been selected and
no post there has been published. Share meaningful verified changes rather than
repeating the same announcement. There is no scheduled posting, automatic
follow-up, paid promotion or unsolicited private outreach.

## Manual measurements after release

30-day goals: 500 stars; stretch 1,000. These are operating targets, not forecasts.
Record values at days 7, 14 and 30 with dates and source windows. No telemetry or
scheduled monitoring is built into this plugin.

| Checkpoint (Asia/Seoul) | Stars / change | GitHub visitors (window) | Confirmed installations | Confirmed continuing users (denominator) |
| --- | --- | --- | --- | --- |
| Release day · 2026-10-02 | 0 / baseline | 0 unique, API rolling 14-day view | 0 external users | 0 / 0 participants; rate undefined |
| Day 7 · 2026-10-09 | Pending | Pending | Pending | Pending |
| Day 14 · 2026-10-16 | Pending | Pending | Pending | Pending |
| Day 30 · 2026-11-01 | Pending | Pending | Pending | Pending |

Downloads are not people. Keep overlapping traffic windows separate rather than
adding their unique visitors. Low traffic suggests improving presentation or
distribution; traffic without installation/use suggests revisiting installation
and the problem before adding features.

The baseline is a release-day API snapshot; traffic reporting may lag. Our own
verification downloads/installations do not count as external users. These dates
are manual checkpoints, not scheduled monitoring.
