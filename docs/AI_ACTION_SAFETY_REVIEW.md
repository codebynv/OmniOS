# AI Action Safety Review

Before an AI-assisted workflow changes business data or triggers an external action:

- Validate the requested operation and its parameters.
- Check the user's authorization in application code.
- Show a clear summary before consequential actions.
- Require explicit confirmation where appropriate.
- Recheck critical conditions at execution time.
- Report the actual result, including partial failure.

A model-generated plan is not authorization. Test side-effecting actions in a safe environment.