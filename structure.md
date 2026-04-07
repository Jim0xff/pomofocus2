# Structure — survey-jim7

## Top-level
- `src/index.ts` — process bootstrap and HTTP listener startup.
- `src/app.ts` — Apollo/Express app assembly.
- `src/schema.ts` — GraphQL contract for questionnaire and submission flows.
- `src/resolvers.ts` — unified envelope resolver wiring.
- `src/models/*` — TypeORM entities.
- `src/services/*` — questionnaire config and submission business services.
- `src/infra/*` — auth, datasource, logger, request-id, and error utilities.

## Layering pattern
- API layer: GraphQL schema + resolvers
- Service layer: questionnaire retrieval, validation, persistence, and admin reads
- Data layer: TypeORM entities and datasource
- Infra layer: auth/logger/request-id/error helpers
