# AI Tool Call Review

Review tool-call changes against these cases:

- Valid arguments produce the expected action.
- Missing or malformed arguments are rejected.
- Unauthorized users cannot invoke restricted actions.
- Timeouts and provider errors remain failures.
- Repeated requests do not create unintended duplicate side effects.
- Untrusted retrieved text cannot override application permissions.

Run checks in a safe test environment and record actual results.