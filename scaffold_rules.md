# Scaffold Rules — redpacket-server

## Keep (scaffold-worthy)
- GraphQL + resolver/service separation pattern.
- TypeORM entity organization (`models`) and datasource bootstrap pattern.
- Infra abstraction layout (`auth`, `logger`, `errors`, `storage`, `cache`, `blockchain`).
- Background queue/caching integration approach (Redis/BullMQ) when async workflow is needed.

## Replace/parameterize
- Domain-specific redpacket/NFT/permit business logic.
- Contract ABI + chain network configs.
- TaskPoint/subgraph endpoint details and credentials.
- Any hardcoded token addresses / chain ids / business constants.

## Must-not-carry blindly
- Repo-specific business entities not required by new PRD.
- Environment secrets, static keys, or network endpoints.
- Any hard-delete operation patterns (convert to soft-delete/status transitions).

## New project bootstrap checklist
1. Confirm backend scope from PRD.
2. Select required modules (GraphQL, DB, queue, chain adapters).
3. Generate entity set from PRD (only needed tables/models).
4. Define API contracts before implementation.
5. Set deletion strategy to soft-delete/status-driven across all mutable aggregates.
