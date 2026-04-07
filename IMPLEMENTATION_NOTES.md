# Implementation Notes (Step 6 Remediation)

## Template Scaffold Compliance
This repository keeps the required template scaffold shape:
- `src/index.ts`
- `src/schema.ts`
- `src/resolvers.ts`
- `src/models/*`
- `src/services/*`
- `src/infra/*`

`structure.md` and `scaffold_rules.md` remain present at repo root.

## sqljs Deviation Trace
Current runtime uses `sqljs` for local self-test closure in the constrained environment.
Schema contracts remain aligned with Step 2 (camelCase fields, unique constraints, index fields).

### Planned Postgres Switch (No API Contract Change)
1. Change datasource `type` from `sqljs` to `postgres`.
2. Provide standard Postgres env vars (`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`).
3. Keep entities/services/API responses unchanged.
