CREATE TABLE IF NOT EXISTS registrations (
  id BIGSERIAL PRIMARY KEY,
  applicant_name VARCHAR(100) NOT NULL,
  contact_phone_or_email VARCHAR(255) NOT NULL,
  project_track VARCHAR(120) NOT NULL,
  self_intro TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_registrations_created_at_desc
  ON registrations (created_at DESC);
