# Retry and Idempotency

Retries can repeat side effects unless operations are designed carefully.

- Retry only errors likely to be transient.
- Bound retries and use backoff.
- Use idempotency keys where supported.
- Do not retry irreversible actions blindly.
- Distinguish timeout from confirmed failure.
- Report the final outcome accurately.

Test the case where a request succeeds remotely but its response is lost.
