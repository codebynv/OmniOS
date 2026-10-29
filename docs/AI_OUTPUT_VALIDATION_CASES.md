# AI Output Validation Cases

Check structured AI output with these cases:

- valid output containing all required fields,
- missing required field,
- unexpected field type,
- malformed structured response,
- response that violates business rules,
- timeout or unavailable provider.

Reject invalid output before it reaches business logic. Record test results only after running the cases; model output must not grant permissions.