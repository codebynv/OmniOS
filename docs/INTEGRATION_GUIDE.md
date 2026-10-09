# Integration Guide

Keep external integrations behind clear application boundaries.

## Guidelines

- Validate outgoing payloads before sending them.
- Validate provider responses before using them.
- Set reasonable timeouts.
- Handle provider errors explicitly.
- Keep credentials in environment configuration.
- Avoid coupling business logic directly to one provider's response format.

Document required configuration without including secret values.
