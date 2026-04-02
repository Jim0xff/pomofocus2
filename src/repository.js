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

  const listResponsesStatement = database.prepare(`
    SELECT response_id, submitted_at
    FROM survey_response
    ORDER BY submitted_at DESC, response_id DESC
    LIMIT ? OFFSET ?
  `);

  const getResponseStatement = database.prepare(`
    SELECT response_id, submitted_at
    FROM survey_response
    WHERE response_id = ?
  `);

  const getResponseAnswersStatement = database.prepare(`
    SELECT question_id, answer_text
    FROM survey_response_answer
    WHERE response_id = ?
    ORDER BY question_id ASC
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

  function listResponses({ page, page_size }) {
    const total = countResponsesStatement.get().count;
    const offset = (page - 1) * page_size;
    const items = listResponsesStatement
      .all(page_size, offset)
      .map((row) => ({ ...row }));

    return {
      items,
      page,
      page_size,
      total,
    };
  }

  function getResponseDetail(responseId) {
    const response = getResponseStatement.get(responseId);
    if (!response) {
      return null;
    }

    const answers = getResponseAnswersStatement
      .all(responseId)
      .map((row) => ({ ...row }));

    return {
      ...response,
      answers,
    };
  }

  return {
    saveResponse,
    countResponses,
    countAnswers,
    listResponses,
    getResponseDetail,
  };
}
