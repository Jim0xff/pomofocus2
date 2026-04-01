# Hackathon Signup API

Phase 2 admin and contract alignment for a small Express API backed by SQLite.

## Requirements

- Node.js 24+

## Setup

```bash
npm install
```

## Run

```bash
npm start
```

Environment variables:

- `PORT`: server port. Defaults to `3000`.
- `DB_PATH`: SQLite database path. Defaults to `./data/signups.sqlite`.
- `ADMIN_TOKEN`: admin token for `/api/admin/*`. Defaults to `dev-admin-token`.

## Test

```bash
npm test
```

## Response Contract

Success:

```json
{
  "success": true,
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Readable message",
    "details": []
  }
}
```

## API

### `POST /api/signups`

Creates a signup and stores it with default `pending` status.

Request body:

```json
{
  "signupType": "individual",
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "phone": "+1234567890",
  "projectName": "Analytical Engine",
  "projectIntro": "A programmable computing platform for hackathon teams."
}
```

Successful response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "signupType": "individual",
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "phone": "+1234567890",
    "projectName": "Analytical Engine",
    "projectIntro": "A programmable computing platform for hackathon teams.",
    "status": "pending",
    "createdAt": "2026-04-01 12:00:00",
    "updatedAt": "2026-04-01 12:00:00"
  }
}
```

### Admin Auth

All `/api/admin/*` endpoints require the header:

```text
x-admin-token: <ADMIN_TOKEN>
```

### `GET /api/admin/signups?page&size&status`

Lists signups ordered by `createdAt DESC`.

Query params:

- `page`: default `1`
- `size`: default `20`, max `100`
- `status`: optional `pending`, `approved`, or `rejected`

### `GET /api/admin/signups/:id`

Returns one signup record.

### `PATCH /api/admin/signups/:id/status`

Updates a signup review status.

Request body:

```json
{
  "status": "approved"
}
```

Successful response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "approved",
    "updatedAt": "2026-04-01 12:05:00"
  }
}
```

## Error Codes

- `VALIDATION_ERROR`
- `INVALID_SIGNUP_TYPE`
- `INVALID_STATUS`
- `FORBIDDEN`
- `SIGNUP_NOT_FOUND`
- `INTERNAL_ERROR`
