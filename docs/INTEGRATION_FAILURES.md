# Integration Failure Handling

External integrations can fail independently of the core application.

## Recommended handling

- Set explicit timeouts.
- Validate provider responses.
- Distinguish temporary failures from invalid requests.
- Retry only when safe and useful.
- Record an operation identifier for troubleshooting.
- Avoid logging credentials or sensitive payloads.

A provider failure should not leave the business record in an ambiguous state.
