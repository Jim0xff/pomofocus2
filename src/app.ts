import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { typeDefs } from './schema.js';
import { resolvers } from './resolvers.js';
import { requestIdMiddleware, errorHandler } from './infra/error.js';
import { getFixedQuestionnaire } from './services/questionnaire_service.js';
import { createSubmission, getSubmissionDetail, listSubmissions } from './services/submission_service.js';

export async function createApp() {
  const app = express();
  app.use(cors({ origin: '*' }));
  app.use(express.json());
  app.use(requestIdMiddleware);

  app.get('/api/questionnaire', async (_req, res, next) => {
    try {
      const q = await getFixedQuestionnaire();
      res.json({ data: { questionnaire_id: q.questionnaireId, questions: q.questions.map((item) => ({ question_id: item.questionId, title: item.title, type: item.type, options: item.options, required: item.required })) } });
    } catch (error) { next(error); }
  });

  app.post('/api/submissions', async (req, res, next) => {
    try {
      const submission = await createSubmission({ questionnaireId: req.body?.questionnaire_id, answers: req.body?.answers });
      res.status(201).json({ data: { submission_id: submission.submissionId, submitted_at: submission.submittedAt, answers: submission.answers.map((a) => ({ question_id: a.questionId, answer_value: a.answerValue })) } });
    } catch (error) { next(error); }
  });

  app.get('/api/admin/submissions', async (req, res, next) => {
    try {
      const page = Number(req.query.page ?? 1); const pageSize = Number(req.query.page_size ?? 20);
      if (Number.isNaN(page) || Number.isNaN(pageSize) || page < 1 || pageSize < 1 || pageSize > 100) throw Object.assign(new Error('invalid pagination'), { code: 'INVALID_REQUEST', status: 400, details: { field: 'page/page_size' } });
      const result = await listSubmissions(page, pageSize);
      res.json({ data: { items: result.items, pagination: { page: result.page, page_size: result.page_size, total: result.total } } });
    } catch (error) { next(error); }
  });

  app.get('/api/admin/submissions/:submissionId', async (req, res, next) => {
    try { const result = await getSubmissionDetail(req.params.submissionId); res.json({ data: result }); }
    catch (error) { next(error); }
  });

  const apollo = new ApolloServer({ typeDefs, resolvers });
  await apollo.start();
  app.use('/graphql', expressMiddleware(apollo));
  app.use(errorHandler);
  return app;
}
