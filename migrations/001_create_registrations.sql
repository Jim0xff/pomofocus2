CREATE TABLE IF NOT EXISTS registrations (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  team_name VARCHAR(120) NOT NULL,
  project_name VARCHAR(160) NOT NULL,
  project_summary TEXT NOT NULL,
  member_count INT NOT NULL CHECK (member_count > 0),
  submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_registrations_email UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_registrations_submitted_at_desc
  ON registrations (submitted_at DESC);
