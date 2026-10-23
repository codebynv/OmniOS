# Tool Timeout Policy

For each integration, define:

- the timeout budget,
- whether the operation can be safely retried,
- the maximum retry count,
- how partial completion is detected,
- the user-facing failure message,
- what diagnostic details may be logged.

Never convert a timeout into a success response. Treat side-effecting operations differently from read-only requests.