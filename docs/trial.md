# First-week trial and launch gate

**Status: not started. No participants or retention results have been recorded.**
The scripted demo validates mechanics, not usefulness. Do not expand features or
claim product validation until this gate has been reviewed.

## Five installation trials

Use five consenting DSH Web 0.2.0-rc.2 users, a packaged archive and the README.
Record participant IDs P1–P5 in the aggregate worksheet, not personal details.
Do not ask for API keys, full session exports or private prompts. Public GitHub
feedback is linked to the contributor's GitHub account; it is not anonymous.
Participation is optional and no automatic tracking is enabled.

Volunteers can open an **Installation trial** from this
repository's **Issues → New issue** menu, then update the same issue after
48 hours. No account beyond the one used for GitHub feedback is needed to report;
the plugin itself needs no separate account. Do not post sensitive work details.

1. Start the timer when the participant receives the archive and instructions.
2. Let them install, find the settings, explain observe versus pause and run the
   keyless example. Record time to a running plugin and any help required.
3. Ask them to use it in their normal work only if comfortable. At 48 hours,
   confirm whether it is still enabled **and has been used**, any false pauses,
   and whether they would keep it. Installed-but-unused is not retained use.
4. Count a pass only when installation took at most five minutes and use is
   confirmed after 48 hours. Record missing follow-ups as unconfirmed.

| ID | Install time | Help needed | Enabled + used at 48h | False pauses / reason removed | Pass |
| --- | --- | --- | --- | --- | --- |
| P1 | Pending | Pending | Pending | Pending | Pending |
| P2 | Pending | Pending | Pending | Pending | Pending |
| P3 | Pending | Pending | Pending | Pending | Pending |
| P4 | Pending | Pending | Pending | Pending | Pending |
| P5 | Pending | Pending | Pending | Pending | Pending |

Continue the remaining development only if **at least 3 of 5** pass. If recruitment
fails or fewer than three pass, stop feature expansion and review the problem,
installation friction and alternatives. Do not replace missing trials with stars,
downloads or positive comments.

## Validation alpha and subsequent launch

A packaged public alpha can provide the verified archive and demo to volunteers.
Source and build instructions are available in this repository; npm publication
and a versioned release are still pending. Label any release as an unvalidated
alpha and invite five opt-in installation trials in the DSH plugin community.
No posts or submissions have been made yet. Broader distribution and feature expansion wait
for the trial result: a DSH use case, an eligible awesome-list submission, then
a short English demo on X from an explicitly selected account.

The [awesome-dsh-plugin contribution rules](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md)
must be checked again at submission time. The repository needs working code, an
installable bundle, the `dsh-plugin` topic and at least one day of public history;
submit the requested single plugin YAML through its review process.

Proposed introduction, to use only with a real release link:

> DSH Retry Guard watches consecutive identical tool failures. Observation is
> the default; opt into pausing before the next model step. This 20-second demo
> uses a scripted model in real DSH Web 0.2.0-rc.2 and needs no API key. Normal
> successful polling continues. Send a new instruction after fixing the cause.

## Manual measurements after release

30-day goals: 500 stars; stretch 1,000. These are operating targets, not forecasts.
Record values at days 7, 14 and 30 with dates and source windows. No telemetry or
scheduled monitoring is built into this plugin.

| Checkpoint | Stars / change | GitHub visitors (window) | Confirmed installations | Confirmed continuing users (denominator) |
| --- | --- | --- | --- | --- |
| Day 7 | Pending | Pending | Pending | Pending |
| Day 14 | Pending | Pending | Pending | Pending |
| Day 30 | Pending | Pending | Pending | Pending |

Downloads are not people. Keep overlapping traffic windows separate rather than
adding their unique visitors. Low traffic suggests improving presentation or
distribution; traffic without installation/use suggests revisiting installation
and the problem before adding features.
