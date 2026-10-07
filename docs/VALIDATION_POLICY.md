# Validation Policy

Validation should happen at the system boundary and at important business-rule boundaries.

## Rules

- Validate client input for usability.
- Re-validate on the server for security.
- Validate external integration responses before persistence.
- Reject malformed or incomplete data early.
- Keep validation messages useful without exposing internals.

The backend remains authoritative for business validation.
