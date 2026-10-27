# AI Error Handling

For AI and provider errors, define the expected user-facing behavior.

- Invalid model output is rejected safely.
- Timeouts remain distinguishable from successful empty results.
- Authorization errors do not disclose restricted information.
- Retries are bounded and safe for the operation.
- Logs include useful correlation context but not secrets.
- The UI reports the actual outcome of a tool action.

Verify these cases against the implementation before describing them as supported.