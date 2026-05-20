# Security Policy

## Reporting a vulnerability

Found a security issue in **open-silong**? Please **do not open a
public GitHub issue**. Instead, email the maintainers at:

**security@rahmanef.com**

If that bounces, fall back to a private GitHub Security Advisory:

1. Go to <https://github.com/rahmanef63/open-silong/security/advisories>
2. Click **Report a vulnerability**

Include in your report:

- A brief description of the issue (one paragraph is fine)
- Steps to reproduce (or a proof-of-concept payload / minimal repro)
- Affected version (commit SHA + which lane: cloud / self-hosted / demo)
- Your impact assessment (what an attacker can do)
- Whether the issue is currently exploited in the wild (best to your knowledge)

## What to expect

| Stage | SLA target |
|---|---|
| Acknowledgement | 48 hours |
| Initial triage (severity + scope) | 5 business days |
| Fix proposal / patch ETA | 14 business days for high-severity |
| Public disclosure | After fix lands + advisory published |

We follow **coordinated disclosure**: we will not publicly discuss the
issue until a fix is shipped to `main` and an advisory is published.
Reporters get credit in the advisory unless they request anonymity.

## Scope

In scope (we care about these):

- The web app at `silong.rahmanef.com` and any future official deploy.
- The npm-published / published Docker images of this repo.
- The source code in this repository.

Out of scope (please don't report these as security issues):

- Vulnerabilities in self-hosted deployments due to misconfiguration
  (e.g., exposing `CONVEX_ADMIN_KEY`, missing TLS, weak Postgres
  password). Document fixes in `DEPLOY.md` instead.
- Reports from automated scanners without manual validation.
- Social engineering / phishing scenarios that require operator error.
- Best-practice nits without an exploit path (e.g., "you should use
  HSTS preload").

## Supported versions

| Version | Supported |
|---|---|
| `main` (active development) | ✅ |
| Tagged releases ≥ 6 months old | Best-effort |
| Forks / vendored copies | ❌ — re-report upstream |

## Hall of fame

Names will land here as reports are responsibly disclosed and fixed.
Thank you for helping keep open-silong users safe.
