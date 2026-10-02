# Alternatives and the hypothesis to test

Reviewed **2026-10-02**. These are descriptions from the maintainers' public
READMEs, not comparative runtime benchmarks. Only Retry Guard has been exercised
in this checkout. A low star count is not proof of either low demand or an open
market.

| Option | Documented trigger and action | Difference to test with users |
| --- | --- | --- |
| [DSH's built-in repeat-tool-reminder](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.0-rc.2/packages/guard/repeat-tool-reminder/README.md) | Identical tool and arguments; advisory notices at 3, 5 and 8 repeats. Does not block. | Retry Guard requires identical **failures** and offers an explicit pause. The built-in reminder may already be sufficient. |
| [dsh-brake](https://github.com/Mlte0907/dsh-brake) | Repeated calls, call sequences and duplicate context; advisory by default, optional denial of repeated calls. | Retry Guard has a smaller rule and three settings. Broader loop coverage may be more useful to some users. |
| [dsh-loop-breaker](https://github.com/ikta2010/dsh-loop-breaker) | Identical tool and arguments; consecutive limit 4 and total limit 12; blocks results and rejects the next step. | Retry Guard observes finalized tool results without replacing them and leaves successful repeats alone. |
| [dsh-discipline-guard](https://github.com/haozheou/dsh-discipline-guard) | Loop and consecutive-failure guards plus usage, route and plan gates; native UI controls. | Failure protection and UI already exist elsewhere. Retry Guard tests whether a smaller, pinned and reproducible package is easier to adopt. |

The differentiation is a **hypothesis**, not a novelty claim: conservative
failure-only detection, source-linked notices, a keyless reproduction and a
verified installation for one DSH version may reduce adoption friction. A
successful polling loop is intentionally outside this rule. Changing error
messages or alternating calls can evade it.

The [reported repeated-work problem](https://github.com/deepseek-ai/deepseek-harness/discussions/6701)
motivates investigation; it does not establish that every call in that incident
had identical arguments and error content, or that this detector would stop it.
Use actual installation and 48-hour use in the [trial](trial.md) to decide whether
to continue. Do not infer demand from DSH's own stars.
