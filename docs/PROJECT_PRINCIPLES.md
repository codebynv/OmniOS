# OmniOS Project Principles

OmniOS is an AI-powered business operating system intended to centralize business operations, automate workflows, and provide intelligent operational insights.

## Product principles

### Unified operations

Business workflows should feel connected rather than like isolated tools.

### Automation with control

Automation should execute predictable actions while keeping important business decisions observable and reviewable.

### AI as an operational layer

AI features should solve concrete workflow problems such as summarization, retrieval, classification, recommendations, and assisted execution.

### Structured data first

Business records should remain structured and queryable even when users interact through natural language.

### Secure by default

Secrets, authentication data, and sensitive business information must not be committed to source control or exposed unnecessarily.

## Engineering principles

- Prefer typed interfaces and explicit validation.
- Keep business logic separate from presentation code.
- Make integrations replaceable where practical.
- Document important architectural decisions.
- Add tests around critical business rules.
- Keep commits focused and reversible.
