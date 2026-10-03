# Security Checklist

Before a deployment or major feature merge:

- [ ] Authentication and authorization paths are covered.
- [ ] Secrets are stored outside source control.
- [ ] User input is validated on the server.
- [ ] File uploads enforce appropriate limits and types.
- [ ] AI output is treated as untrusted input where applicable.
- [ ] Database queries use safe parameterization through the chosen data layer.
- [ ] Sensitive logs are avoided.
- [ ] Production configuration is separated from local development.

Security-sensitive actions should be auditable and protected by explicit authorization checks.
