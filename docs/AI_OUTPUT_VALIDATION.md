# AI Output Validation

Treat model output as untrusted data.

- Validate structured output against an expected schema.
- Handle missing or malformed fields.
- Do not execute generated commands without explicit controls.
- Apply authorization checks independently of model suggestions.
- Keep sensitive information out of prompts unless required and permitted.
- Record failures without logging confidential payloads.

AI-generated content should pass application validation before it changes business state.
