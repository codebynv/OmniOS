# Structured Tool Errors

Use stable error categories for tool failures.

- Invalid arguments
- Permission denied
- Timeout
- Dependency unavailable
- Operation failed
- Result unavailable

Include safe recovery guidance where possible. Keep internal stack traces and secrets out of user-facing messages, and ensure callers can distinguish failure from an empty successful result.