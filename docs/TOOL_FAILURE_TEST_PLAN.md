# Tool Failure Test Plan

For every external tool integration, verify:

- valid input returns a validated result,
- malformed input is rejected,
- unauthorized calls are blocked,
- timeouts produce a clear failure state,
- repeated requests do not accidentally duplicate side effects,
- logs do not contain credentials or sensitive payloads.

Test failures deliberately in a safe environment. Never report a tool action as successful unless its result confirms success.