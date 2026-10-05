# OmniOS Observability

Operational workflows should expose enough information to understand what happened.

## Useful events

- authentication result,
- business action started,
- business action completed,
- integration failure,
- AI request status,
- authorization denial.

Avoid logging secrets or sensitive business payloads. Prefer structured events with a trace or request identifier.
