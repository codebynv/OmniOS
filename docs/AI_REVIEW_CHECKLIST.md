# AI Feature Review Checklist

Before shipping an AI-assisted feature:

- [ ] Define the user problem it solves.
- [ ] Validate inputs and model outputs.
- [ ] Handle timeouts and provider failures.
- [ ] Check privacy and data-retention implications.
- [ ] Keep authorization independent of model output.
- [ ] Provide a safe fallback when possible.
- [ ] Measure quality against representative examples.

Do not treat fluent model output as proof of correctness.
