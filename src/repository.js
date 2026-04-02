export function createResponseRepository(database) {
  const insertResponseStatement = database.prepare(`
    INSERT INTO survey_response (response_id, submitted_at)
    VALUES (?, ?)
  `);

  const insertAnswerStatement = database.prepare(`
    INSERT INTO survey_response_answer (response_id, question_id, answer_text)
    VALUES (?, ?, ?)
  `);

  const countResponsesStatement = database.prepare(`
    SELECT COUNT(*) AS count
    FROM survey_response
  `);

  const countAnswersStatement = database.prepare(`
    SELECT COUNT(*) AS count
    FROM survey_response_answer
  `);

  function saveResponse(response) {
    database.exec('BEGIN');

    try {
      insertResponseStatement.run(response.response_id, response.submitted_at);

      for (const answer of response.answers) {
        insertAnswerStatement.run(response.response_id, answer.question_id, answer.answer_text);
      }

      database.exec('COMMIT');
    } catch (error) {
      database.exec('ROLLBACK');
      throw error;
    }
  }

  function countResponses() {
    return countResponsesStatement.get().count;
  }

  function countAnswers() {
    return countAnswersStatement.get().count;
  }

  return {
    saveResponse,
    countResponses,
    countAnswers,
  };
}
