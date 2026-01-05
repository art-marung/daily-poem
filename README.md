Operational Integrity
Purpose

This application is designed to generate and serve one poem per day, reliably and quietly.
Its primary goal is continuity, not optimization or engagement.

Reliability & Failure Handling

The system attempts to generate one poem per calendar day.

If generation via the OpenAI API fails, a predefined fallback poem is used.

If a scheduled run is missed, the system supports recovery without user-facing disruption.

At no point should the application serve empty content; the most recent valid poem is always available.

Deterministic Behavior

Poems are keyed and stored by date.

Once generated or selected, a poem for a given date does not change.

Serving logic is read-only and does not trigger generation.

Re-running the system for the same date is idempotent.

Data Storage & Logging

Data is stored locally in JSON files.

Logs and records are append-only where practical.

Each day’s outcome (generation source, fallback usage, recovery status) is explicitly recorded.

The system favors clarity and traceability over volume or verbosity.

Data Minimization & Privacy

The application does not collect personal user data.

No user accounts, identifiers, emails, or IP addresses are stored.

Any usage metrics are aggregate and anonymous by design.

Analytics are observational and do not influence content generation.

Security & Secrets

Sensitive credentials (e.g. API keys) are managed via environment variables.

No secrets are committed to version control.

The repository is safe to clone and inspect without exposing credentials.

Scope & Intent

This project intentionally avoids:

behavioral profiling

engagement optimization

persuasive or manipulative mechanics

unnecessary complexity

Its design favors:

calm operation

transparency

minimal data collection

long-term maintainability

Maintenance Philosophy

The system is expected to run unattended for long periods.
Changes are made deliberately, with preference for stability over feature expansion.

When in doubt, the system defaults to:

continuing service with existing content

recording what happened

avoiding user-facing disruption

End of integrity section.