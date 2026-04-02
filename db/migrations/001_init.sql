CREATE TABLE IF NOT EXISTS survey_response (
  response_id TEXT PRIMARY KEY,
  submitted_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_survey_response_submitted_at
  ON survey_response (submitted_at DESC);

CREATE TABLE IF NOT EXISTS survey_response_answer (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  response_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  answer_text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sra_response_id
    FOREIGN KEY (response_id) REFERENCES survey_response (response_id)
    ON DELETE CASCADE,
  CONSTRAINT uk_sra_response_question
    UNIQUE (response_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_sra_response_id
  ON survey_response_answer (response_id);

CREATE INDEX IF NOT EXISTS idx_sra_question_id
  ON survey_response_answer (question_id);
