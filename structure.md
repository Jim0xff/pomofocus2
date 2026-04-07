# Structure — redpacket-server

## Top-level
- `src/index.ts` — process bootstrap, app/server startup.
- `src/schema.ts` — GraphQL schema declaration.
- `src/resolvers.ts` — GraphQL resolver wiring.
- `src/models/*` — TypeORM entities (redpacket, item, budget, claim/task/chat related).
- `src/services/*` — business services + external clients.
- `src/infra/*` — infra adapters/utilities (auth, datasource, logger, storage, blockchain, cache, errors).
- `src/abis/RedpacketFactory.json` — contract ABI.

## Layering pattern
- API layer: GraphQL schema + resolvers
- Service layer: business orchestration and external system calls
- Data layer: TypeORM entities and datasource
- Infra layer: auth/logger/storage/cache/blockchain helpers

## Notable integration points
- TaskPoint client (`src/services/task_point_client.ts`)
- Contract & permit utilities (`src/infra/permit.ts`, `src/infra/blockchain.ts`)
- Async/background behavior via Redis/BullMQ (`bullmq`, `ioredis` deps)
