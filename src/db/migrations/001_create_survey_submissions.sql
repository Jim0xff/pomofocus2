CREATE TABLE IF NOT EXISTS survey_submissions (
  id varchar(64) PRIMARY KEY,
  questionnaire_id varchar(64) NOT NULL,
  answers jsonb NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  submitter_meta jsonb NULL
);

CREATE INDEX IF NOT EXISTS idx_survey_submissions_submitted_at_desc
  ON survey_submissions (submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_survey_submissions_questionnaire_id
  ON survey_submissions (questionnaire_id);
