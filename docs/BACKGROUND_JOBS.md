# Background Jobs

Long-running work should not block interactive requests.

## Suitable jobs

- scheduled reports,
- data synchronization,
- document processing,
- non-immediate notifications,
- expensive AI workflows.

## Reliability

Jobs should expose status, handle failures, and avoid duplicate execution where possible. Keep retries bounded and observable.
