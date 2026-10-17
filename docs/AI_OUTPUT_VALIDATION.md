# AI Output Validation

Treat model output as untrusted input.

- Validate required fields and types.
- Reject malformed structured output.
- Apply business rules before saving or executing.
- Escape content before rendering it in a UI.
- Handle missing and unexpected values safely.
- Keep authorization checks outside the model.

Do not let plausible-looking output bypass application validation.
