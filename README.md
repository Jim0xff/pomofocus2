# pomofocus2-survey-backend

Minimal survey backend for fixed questionnaire submission and admin review.

## Endpoints
- `GET /api/questionnaires/fixed`
- `POST /api/submissions`
- `GET /api/admin/submissions`
- `GET /api/admin/submissions/:response_id`

## Runtime
- Node: 24.14.0
- Env: `DATABASE_URL`, `ADMIN_TOKEN` (optional, default `dev-admin-token`)

## Build
```bash
npm install
npm run compile
node dist/index.js
```
