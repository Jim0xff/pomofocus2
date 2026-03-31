import { getPool } from "../db/pool";

export async function insertAdminAccessToken(tokenHash: string, expiresAt: string): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO admin_access_tokens (token_hash, expires_at)
     VALUES ($1, $2)`,
    [tokenHash, expiresAt]
  );
}

export async function existsValidAdminAccessToken(tokenHash: string): Promise<boolean> {
  const pool = getPool();
  const result = await pool.query<{ id: number }>(
    `SELECT id
     FROM admin_access_tokens
     WHERE token_hash = $1
       AND revoked_at IS NULL
       AND expires_at > CURRENT_TIMESTAMP
     LIMIT 1`,
    [tokenHash]
  );
  return (result.rowCount ?? 0) > 0;
}
