# Phase 3 Evidence

## Scope

This increment adds reproducible plain-Node load tooling for the `step_5` pressure targets and now includes a completed full-profile execution:

- `submit` target concurrency: `100`
- `admin_list` target concurrency: `50`
- metrics captured: `p95` latency and unexpected `5xx` rate
- `submit` integrity check: successful `201` count must equal the database growth in `survey_response` rows during the run

## Full profile run

Status: `EXECUTED`

Date: `2026-04-02T10:51:49.472Z`

Server start command:

```bash
PORT=3101 \
SURVEY_DB_PATH=/tmp/survey-jim2-phase3-full/load.sqlite \
ADMIN_API_TOKEN=admin-secret-token \
ADMIN_READONLY_TOKEN=readonly-secret-token \
node src/server.js
```

Load test command:

```bash
LOAD_TEST_BASE_URL=http://127.0.0.1:3101 \
LOAD_TEST_DB_PATH=/tmp/survey-jim2-phase3-full/load.sqlite \
LOAD_TEST_ADMIN_TOKEN=admin-secret-token \
npm run load:test:full
```

Profile used: `full`

- `submit` stages: `20s ramp/hold target 100`, `120s hold 100`, `20s ramp-down to 0`
- `admin_list` stages: `20s ramp/hold target 50`, `120s hold 50`, `20s ramp-down to 0`

## Full profile results summary

| Scenario | Target concurrency | Completed requests | Success count | Unexpected 5xx | Unexpected 5xx rate | p95 latency |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `submit` | 100 | 56502 | 56502 | 0 | 0.0000 | 395 ms |
| `admin_list` | 50 | 114834 | 114834 | 0 | 0.0000 | 80 ms |

## Full profile submit DB integrity check

- `survey_response` rows before run: `0`
- `survey_response` rows after run: `56502`
- inserted rows during run: `56502`
- successful `submit` responses: `56502`
- verification result: `PASS` (`successCount === dbInsertedRows`)

## Local baseline run

Date: `2026-04-02T10:48:59.043Z`

Server start command:

```bash
PORT=3101 \
SURVEY_DB_PATH=/tmp/survey-jim2-phase3/load.sqlite \
ADMIN_API_TOKEN=admin-secret-token \
ADMIN_READONLY_TOKEN=readonly-secret-token \
node src/server.js
```

Load test command:

```bash
LOAD_TEST_BASE_URL=http://127.0.0.1:3101 \
LOAD_TEST_DB_PATH=/tmp/survey-jim2-phase3/load.sqlite \
LOAD_TEST_ADMIN_TOKEN=admin-secret-token \
npm run load:test:baseline
```

Profile used: `local-baseline`

- `submit` stages: `3s ramp/hold target 100`, `6s hold 100`, `3s ramp-down to 0`
- `admin_list` stages: `3s ramp/hold target 50`, `6s hold 50`, `3s ramp-down to 0`

This is a reduced-duration local baseline intended to keep local execution practical. The authoritative pressure evidence is the full profile above.

## Results summary

| Scenario | Target concurrency | Completed requests | Success count | Unexpected 5xx | Unexpected 5xx rate | p95 latency |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `submit` | 100 | 3511 | 3511 | 0 | 0.0000 | 338 ms |
| `admin_list` | 50 | 88484 | 88484 | 0 | 0.0000 | 11 ms |

## Submit DB integrity check

- `survey_response` rows before run: `0`
- `survey_response` rows after run: `3511`
- inserted rows during run: `3511`
- successful `submit` responses: `3511`
- verification result: `PASS` (`successCount === dbInsertedRows`)

## Reproduction

Available npm scripts:

- `npm run load:test`
- `npm run load:test:baseline`
- `npm run load:test:full`
