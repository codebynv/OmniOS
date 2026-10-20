# Tool Permission Boundaries

Every tool action should have an explicit contract.

- Validate arguments against a schema.
- Check user authorization independently of model output.
- Restrict file, network, and system access to the minimum needed.
- Require confirmation for consequential actions.
- Return structured errors without leaking secrets.
- Record meaningful actions for audit when appropriate.

A model request is not itself permission to perform an operation.
