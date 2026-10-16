# AI Incident Handling

If an AI workflow returns unsafe or malformed output:

1. Stop downstream actions.
2. Preserve non-sensitive diagnostic context.
3. Check whether business state changed.
4. Recover through the normal rollback process if needed.
5. Review input and provider-response handling.
6. Add a regression example before re-enabling the workflow.

Never bypass authorization or validation to make a workflow appear successful.
