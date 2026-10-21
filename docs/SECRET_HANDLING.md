# Secret Handling

- Load credentials from a managed secret store or environment configuration.
- Never commit real tokens, passwords, or private keys.
- Avoid including secrets in logs, prompts, and exception messages.
- Use least-privilege credentials for integrations.
- Rotate exposed credentials and investigate their use.
- Keep example configuration files free of real values.

A .gitignore rule does not protect secrets that are already tracked.