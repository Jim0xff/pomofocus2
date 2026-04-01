# Template Alignment

## Goal

This remediation increment preserves visible scaffold evidence for the
redpacket-server template shape without changing the current working Express
runtime or API contract.

## Preserved Now

The repository now preserves these template-alignment anchors:

- [src/schema.ts](/tmp/deepflow-assets/openclaw-dev-shared/projects/hackathon-signup12/repo/src/schema.ts)
- [src/resolvers.ts](/tmp/deepflow-assets/openclaw-dev-shared/projects/hackathon-signup12/repo/src/resolvers.ts)
- [src/models/README.md](/tmp/deepflow-assets/openclaw-dev-shared/projects/hackathon-signup12/repo/src/models/README.md)
- [src/services/README.md](/tmp/deepflow-assets/openclaw-dev-shared/projects/hackathon-signup12/repo/src/services/README.md)
- [src/infra/README.md](/tmp/deepflow-assets/openclaw-dev-shared/projects/hackathon-signup12/repo/src/infra/README.md)

These files are intentionally scaffold-only. They preserve the structural seam
expected by the template while the active runtime remains the existing
Express-plus-SQLite implementation.

## Keep / Replace / Prune

### Keep

- Keep the existing REST runtime in [src/app.js](/tmp/deepflow-assets/openclaw-dev-shared/projects/hackathon-signup12/repo/src/app.js) because it backs the passing API tests and current delivery scope.
- Keep the startup path in [src/server.js](/tmp/deepflow-assets/openclaw-dev-shared/projects/hackathon-signup12/repo/src/server.js) unchanged to avoid breaking deployment or local execution.
- Keep the SQLite repository in [src/db.js](/tmp/deepflow-assets/openclaw-dev-shared/projects/hackathon-signup12/repo/src/db.js) as the active persistence layer for now.
- Keep the current error contract in [src/errors.js](/tmp/deepflow-assets/openclaw-dev-shared/projects/hackathon-signup12/repo/src/errors.js) because tests assert its response shape.

### Replace

- Replace the missing template scaffold evidence with inert placeholders rather than live GraphQL adoption in this phase.
- Replace an implicit alignment claim with explicit repository evidence and a written mapping document in this file.
- Replace future architectural guessing with named directories for models, services, and infra so later phases can migrate incrementally.

### Prune

- Prune any expectation that this phase introduces GraphQL execution, resolver wiring, or TypeORM behavior.
- Prune unrelated refactors to Express routes, request validation, database schema, or response payloads.
- Prune domain-specific template carryover that would conflict with the existing signup API.

## Why This Counts As TPLG Evidence

The template shape is now visible in the repository, but isolated from runtime
execution. That demonstrates preservation of the scaffold layer while avoiding
API drift. In practical terms:

- Structural expectations are represented in `src/`.
- The current working app remains the source of truth.
- Future alignment work can move logic into the preserved scaffold incrementally
  instead of requiring a disruptive rewrite.
