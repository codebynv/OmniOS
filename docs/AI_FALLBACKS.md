# AI Fallbacks

AI-assisted features should remain understandable when a model or provider is unavailable.

- Set bounded timeouts.
- Show a clear failure state.
- Preserve user input when safe.
- Offer a deterministic fallback when appropriate.
- Do not repeat expensive requests indefinitely.
- Keep business-critical actions behind normal validation and authorization.

A fallback should fail safely rather than inventing a successful result.
