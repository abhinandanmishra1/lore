# Security Policy

## Reporting a vulnerability

Please do **not** open a public issue for security vulnerabilities.

Instead, report it privately through GitHub's [private vulnerability reporting][gh-advisory]
(the "Report a vulnerability" button under the repository's **Security** tab). Include:

- A description of the vulnerability and its impact
- Steps to reproduce
- Affected version(s)

You can expect an initial response within a few days. Once the issue is confirmed, a fix
will be prepared and released, and you will be credited unless you prefer to remain anonymous.

## Scope

Lore stores engineering memory locally under `~/.lore` (or `$LORE_HOME`) and reads from your
local git, GitHub CLI, and Slack context. Of particular interest:

- Any path that could write outside the configured store root
- Leakage of secrets or tokens into stored entries or logs
- Injection through untrusted branch names, PR titles, or note content

[gh-advisory]: https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability
