CREATE TABLE IF NOT EXISTS admin_access_tokens (
  id BIGSERIAL PRIMARY KEY,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP NULL,
  CONSTRAINT uq_admin_access_tokens_token_hash UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS idx_admin_access_tokens_expires_at
  ON admin_access_tokens (expires_at);
