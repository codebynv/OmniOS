# AI Tool Observability

For each AI-assisted tool workflow, consider recording:

- a correlation identifier,
- tool name and operation category,
- start time and duration,
- outcome category,
- retry count where relevant,
- safe diagnostic context.

Do not log credentials, private prompts, or unnecessary personal data. Define retention and access rules. Metrics should reflect real outcomes, not merely the number of attempted calls.