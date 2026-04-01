CREATE TABLE signups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  team_size INT NOT NULL CHECK (team_size > 0),
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_signups_created_at ON signups(created_at);
CREATE INDEX idx_signups_email ON signups(email);
