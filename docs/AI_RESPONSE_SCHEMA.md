# AI Response Schema

For each structured AI response, document:

- required fields and their types,
- allowed values and optional fields,
- handling of missing or extra fields,
- validation failures and safe fallbacks,
- compatibility expectations when the schema changes.

Validate model output before using it in business logic. Keep authorization and business rules outside the model response.