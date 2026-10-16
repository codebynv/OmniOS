# Prompt Injection Considerations

Treat retrieved documents, uploaded content, and external tool results as untrusted data.

- Separate instructions from data where supported.
- Do not let retrieved content override application policy.
- Validate tool arguments against a schema or allowlist.
- Enforce authorization outside the model.
- Require confirmation for consequential actions.
- Avoid exposing secrets in prompts or responses.

Prompt-level defenses complement, but do not replace, application security controls.
