# Reuse Notes — redpacket-server

## Recommended reuse scenarios
- Backend systems needing GraphQL + PostgreSQL + Redis queue stack.
- Service-oriented Node.js apps with external API + blockchain integrations.
- Projects requiring clear infra/service/model layering.

## Cautions
- This template is blockchain/redpacket heavy; trim domain modules aggressively when unrelated.
- Puppeteer/S3/IPFS integrations increase ops complexity; include only if PRD requires.
- Keep idempotency and retry semantics explicit in async job design.

## Suggested template profile
- template_id: `redpacket-server`
- stack profile: `node-ts-graphql-typeorm-postgres-redis`
- default project_type fit: `existing_repo refactor` or `new backend service with GraphQL`

## Quality gates when reusing
- API contracts complete before coding.
- Schema/index/constraints validated before implementation.
- Test analysis includes API + concurrency/error-path coverage.
- No hard-delete behavior introduced.
