# Data Security Notes

OmniOS handles business data that may be sensitive.

## Rules

- Validate access before returning records.
- Never expose credentials through API responses.
- Keep secrets outside source control.
- Log operational events without unnecessarily logging sensitive payloads.
- Validate uploaded files and external inputs.
- Keep AI-generated output subject to application-level authorization.

Security controls should be enforced by the backend rather than trusted solely to the frontend.
