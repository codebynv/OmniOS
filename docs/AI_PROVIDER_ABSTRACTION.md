# AI Provider Abstraction

Keep provider-specific calls behind a small application interface.

- Normalize request and response formats.
- Keep provider configuration outside business logic.
- Handle provider-specific errors at the integration boundary.
- Validate normalized outputs before use.
- Make provider replacement possible without rewriting UI components.

Avoid building unnecessary abstraction before there are real integration requirements.
