# OmniOS Architecture Notes

## Logical layers

    React / TypeScript UI
            ↓
    API / Application Layer
            ↓
    Business Services
            ↓
    PostgreSQL + Redis
            ↓
    AI / Retrieval Services

## Responsibilities

### Frontend

Own presentation, navigation, forms, client-side validation, and data fetching.

### Backend

Own authentication, authorization, business rules, file handling, and API contracts.

### Data

Use PostgreSQL for durable business records and Redis where short-lived caching or coordination is appropriate.

### AI

Keep model calls behind application services so providers can be changed without coupling the UI to a specific model API.

## Engineering rule

Business-critical actions should remain deterministic and auditable even when AI is used to assist the workflow.
