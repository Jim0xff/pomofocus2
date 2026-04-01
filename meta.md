# Template Meta — redpacket-server

- template_id: `redpacket-server`
- source_repo: `https://github.com/0xLazAI/redpacket-server.git`
- analyzed_at_utc: `2026-03-20`
- stack_tags: `nodejs`, `typescript`, `graphql`, `apollo-server`, `express`, `typeorm`, `postgresql`, `redis`, `bullmq`, `web3`
- domain_tags: `redpacket`, `nft`, `permit-signature`, `blockchain-integration`, `taskpoint`
- project_shape: `backend-only monolith service`
- entrypoint: `src/index.ts`
- api_style: `GraphQL`
- persistence: `PostgreSQL (TypeORM)`
- queue_cache: `Redis (BullMQ + cache)`

## Summary
A TypeScript backend for redpacket generation and claim workflows, with on-chain permit/signature support and optional NFT/Agent linked flows. Uses GraphQL (Apollo + Express), PostgreSQL models via TypeORM, and Redis-backed async jobs/queue patterns.
