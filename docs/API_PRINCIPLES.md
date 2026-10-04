# API Principles

The backend API should expose stable, predictable contracts between the React client and server.

## Principles

- Validate request data at the server boundary.
- Return consistent success and error structures.
- Keep authorization checks on the server.
- Keep business rules out of presentation code.
- Avoid exposing internal implementation details.

## Changes

When an endpoint changes, update the relevant documentation and verify existing consumers before merging.
