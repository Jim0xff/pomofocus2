# Template Alignment

## Goal

This remediation increment moves several template seams from placeholder-only
documentation into the active runtime without changing the current Express API
contract.

## Active Keep-Items

The following alignment items are now live and imported by the running app:

- Real config loading in [src/infra/config-loader.js](/tmp/deepflow-assets/openclaw-dev-shared/projects/hackathon-signup12/repo/src/infra/config-loader.js), used directly by [src/server.js](/tmp/deepflow-assets/openclaw-dev-shared/projects/hackathon-signup12/repo/src/server.js).
- Real logging in [src/infra/logger.js](/tmp/deepflow-assets/openclaw-dev-shared/projects/hackathon-signup12/repo/src/infra/logger.js), used by startup in [src/server.js](/tmp/deepflow-assets/openclaw-dev-shared/projects/hackathon-signup12/repo/src/server.js) and by request error handling in [src/middleware/error-handler.js](/tmp/deepflow-assets/openclaw-dev-shared/projects/hackathon-signup12/repo/src/middleware/error-handler.js).
- Real middleware wiring in [src/middleware/request-context.js](/tmp/deepflow-assets/openclaw-dev-shared/projects/hackathon-signup12/repo/src/middleware/request-context.js), [src/middleware/not-found.js](/tmp/deepflow-assets/openclaw-dev-shared/projects/hackathon-signup12/repo/src/middleware/not-found.js), and [src/middleware/error-handler.js](/tmp/deepflow-assets/openclaw-dev-shared/projects/hackathon-signup12/repo/src/middleware/error-handler.js), all mounted by [src/app.js](/tmp/deepflow-assets/openclaw-dev-shared/projects/hackathon-signup12/repo/src/app.js).
- Executable harness anchors in [scripts/selftest.js](/tmp/deepflow-assets/openclaw-dev-shared/projects/hackathon-signup12/repo/scripts/selftest.js) and `package.json` scripts `selftest` and `check`.

The repository still preserves the previously added scaffold-only files for
future template work:

- [src/schema.ts](/tmp/deepflow-assets/openclaw-dev-shared/projects/hackathon-signup12/repo/src/schema.ts)
- [src/resolvers.ts](/tmp/deepflow-assets/openclaw-dev-shared/projects/hackathon-signup12/repo/src/resolvers.ts)
- [src/models/README.md](/tmp/deepflow-assets/openclaw-dev-shared/projects/hackathon-signup12/repo/src/models/README.md)
- [src/services/README.md](/tmp/deepflow-assets/openclaw-dev-shared/projects/hackathon-signup12/repo/src/services/README.md)
- [src/infra/README.md](/tmp/deepflow-assets/openclaw-dev-shared/projects/hackathon-signup12/repo/src/infra/README.md)

## Keep / Replace / Prune

### Keep

- Keep the existing REST runtime in [src/app.js](/tmp/deepflow-assets/openclaw-dev-shared/projects/hackathon-signup12/repo/src/app.js) because it backs the passing API tests and current delivery scope.
- Keep the startup path in [src/server.js](/tmp/deepflow-assets/openclaw-dev-shared/projects/hackathon-signup12/repo/src/server.js), but route it through the live config loader and logger modules.
- Keep the SQLite repository in [src/db.js](/tmp/deepflow-assets/openclaw-dev-shared/projects/hackathon-signup12/repo/src/db.js) as the active persistence layer for now.
- Keep the current error contract in [src/errors.js](/tmp/deepflow-assets/openclaw-dev-shared/projects/hackathon-signup12/repo/src/errors.js) because tests assert its response shape.

### Replace

- Replace startup-local config parsing with the reusable loader in [src/infra/config-loader.js](/tmp/deepflow-assets/openclaw-dev-shared/projects/hackathon-signup12/repo/src/infra/config-loader.js).
- Replace startup-local and error-path console usage with the reusable logger in [src/infra/logger.js](/tmp/deepflow-assets/openclaw-dev-shared/projects/hackathon-signup12/repo/src/infra/logger.js).
- Replace inline terminal middleware blocks with dedicated modules under [src/middleware](/tmp/deepflow-assets/openclaw-dev-shared/projects/hackathon-signup12/repo/src/middleware).
- Replace placeholder-only harness claims with executable evidence in [scripts/selftest.js](/tmp/deepflow-assets/openclaw-dev-shared/projects/hackathon-signup12/repo/scripts/selftest.js).

### Prune

- Prune any expectation that this phase introduces GraphQL execution, resolver wiring, or TypeORM behavior.
- Prune unrelated refactors to Express routes, request validation, database schema, or response payloads.
- Prune domain-specific template carryover that would conflict with the existing signup API.

## Evidence

This now counts as real template alignment because the keep-items are active in
runtime code, not just described in docs. Specifically:

- Server startup calls `loadConfig()` before creating the database connection and listener.
- The app mounts dedicated request-context, not-found, and error middleware modules.
- Unhandled errors now flow through a logger-backed middleware path instead of an inline `console.error`.
- `npm run selftest` executes a real in-memory smoke check against `/health` and `POST /api/signups`.

The current working app remains the source of truth, and future alignment work
can continue moving logic into these preserved seams incrementally instead of
requiring a rewrite.
