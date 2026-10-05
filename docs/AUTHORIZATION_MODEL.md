# Authorization Model

Authorization must be enforced on the backend.

## Rules

- Authenticate the requesting user.
- Check access before reading or modifying business records.
- Keep role and permission checks centralized where practical.
- Never rely on hidden frontend controls as a security boundary.
- Audit sensitive actions.

Every protected operation should have an explicit authorization decision.
