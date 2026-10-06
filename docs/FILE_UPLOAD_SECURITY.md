# File Upload Security

File uploads must be treated as untrusted input.

## Rules

- Validate file type and size on the server.
- Do not trust client-provided MIME types alone.
- Store uploads outside executable source paths.
- Generate safe server-side filenames where appropriate.
- Reject unexpected formats.
- Keep uploaded content out of logs.

Authentication and authorization must be checked before accepting protected uploads.
