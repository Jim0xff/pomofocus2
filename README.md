# Pomofocus2 Backend

Phase 1 scaffolds the backend GraphQL service and core infrastructure only. Domain business logic is intentionally deferred.

## Run

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the sample environment file and adjust values as needed:

   ```bash
   cp .env.example .env
   ```

3. Start the service in development mode:

   ```bash
   npm run dev
   ```

4. Verify the scaffold:

   ```bash
   npm run build
   npm test
   ```

If package installation is not available in the environment, there is also a dependency-free smoke test:

```bash
npm run test:smoke
```

The service exposes:

- `GET /health`
- `POST /graphql`

By default the app does not require PostgreSQL or Redis to be reachable on boot. Set `ENABLE_DB_ON_BOOT=true` and/or `ENABLE_REDIS_ON_BOOT=true` to validate those connections during startup.

## Docker

Build image:

```bash
docker build -t pomofocus2-backend:latest .
```

Run container:

```bash
docker run --rm -p 3000:3000 --env-file .env pomofocus2-backend:latest
```

Dockerfile uses a multi-stage build and installs only production npm packages in runtime image (`npm ci --omit=dev`).
