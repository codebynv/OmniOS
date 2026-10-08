# Rate Limiting

External and user-facing APIs should be protected from accidental or abusive request volume.

- Define sensible limits for expensive operations.
- Return a clear response when a limit is reached.
- Apply stricter controls to authentication and AI endpoints.
- Avoid retry storms from clients and background jobs.
- Monitor repeated limit violations.

Rate limits should protect availability without becoming the only security control.
