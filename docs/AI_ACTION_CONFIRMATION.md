# AI Action Confirmation

Before an AI-assisted workflow performs a consequential action:

- Show the proposed action and relevant parameters.
- Validate the request against application rules.
- Confirm the current user is authorized.
- Require explicit approval when appropriate.
- Recheck critical conditions at execution time.
- Report the actual result, including failure.

A model-generated suggestion should not silently become an irreversible operation.
