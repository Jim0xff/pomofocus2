# Step6 Obligation Evidence Matrix

This file is the remediation evidence document for review_id=8.

## Branch / Commits
- branch: `dev-survey-jim2-2026-04-02-10-16`
- phase_1: `1fab9a5`
- phase_2: `9d84710`
- phase_3 baseline/tooling: `f6597b8`
- phase_3 full-profile evidence: `12448b5`
- remediation evidence commit: (this commit)

## Obligation Closure (OBL-001 ~ OBL-013)

| obligation_id | implementation_target | code evidence | tests/evidence | deviation |
|---|---|---|---|---|
| OBL-001 | 固定问卷读取接口 | `src/app.js`, `src/survey.js` | TC-SURVEY-001 pass (`npm test`) | none |
| OBL-002 | text/multiline 题型契约 | `src/survey.js` | TC-SURVEY-002 pass | none |
| OBL-003 | 提交成功语义 | `src/app.js`, `src/service.js` | TC-SUBMIT-001 pass | none |
| OBL-004 | admin 列表接口 | `src/app.js`, `src/repository.js`, `src/service.js`, `src/validation.js` | TC-ADMIN-LIST-001/002 pass | none |
| OBL-005 | admin 详情接口 | `src/app.js`, `src/repository.js`, `src/service.js` | TC-ADMIN-DETAIL-001/002 pass | none |
| OBL-006 | 必填/非法校验 | `src/validation.js`, `src/errors.js` | TC-SUBMIT-002/003 pass | none |
| OBL-007 | 问卷固定，不支持改题 | `src/app.js` route surface | TC-ROUTE-001 pass | none |
| OBL-008 | 允许重复提交 | `src/service.js`, `src/repository.js` | TC-SUBMIT-004 pass | none |
| OBL-009 | 不支持提交后编辑 | `src/app.js` route surface | TC-ROUTE-002 pass | none |
| OBL-010 | 不提供导出 | `src/app.js` route surface | TC-ROUTE-003 pass | none |
| OBL-011 | 提交持久化一致性 | `db/migrations/001_init.sql`, `src/repository.js` | TC-DB-001 pass + full profile DB integrity PASS | none |
| OBL-012 | 列表/详情查询持久层可用 | `src/repository.js`, `src/service.js` | TC-DB-002 pass | none |
| OBL-013 | 统一响应 envelope | `src/app.js`, `src/errors.js` | TC-CONTRACT-001/002 pass | none |

## API Test Record
- command: `npm test --silent`
- latest result: 20 passed, 0 failed

## Pressure / Concurrency Evidence
- tooling: `scripts/run-load-test`, `src/load-test.js`
- full profile command: `npm run load:test:full`
- evidence file: `docs/phase3-evidence.md`
- key full profile numbers:
  - submit: 56502 success, p95 395ms, unexpected 5xx 0
  - admin_list: 114834 success, p95 80ms, unexpected 5xx 0
  - submit DB integrity PASS
