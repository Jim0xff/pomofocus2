import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import {
  FIXED_QUESTIONNAIRE_ID,
  addSubmission,
  fixedQuestionnaire,
  getSubmission,
  listSubmissions,
  nextResponseId,
  type SurveyAnswer,
} from './survey_store.js';

const app = express();
const port = Number(process.env.PORT || 4000);
const adminToken = process.env.ADMIN_TOKEN || 'dev-admin-token';

app.use(cors({ origin: '*' }));
app.use(express.json());

app.use((req, res, next) => {
  const requestId = String(req.headers['x-request-id'] || randomUUID());
  res.setHeader('x-request-id', requestId);
  (req as any).requestId = requestId;
  next();
});

function errorBody(code: string, message: string, requestId: string, details: unknown = null) {
  return { code, message, requestId, details };
}

function requireAdmin(req: express.Request, res: express.Response): boolean {
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${adminToken}`) {
    res.status(401).json(errorBody('UNAUTHORIZED', 'Invalid admin token', (req as any).requestId));
    return false;
  }
  return true;
}

app.get('/api/questionnaires/fixed', (_req, res) => {
  res.json({
    questionnaire_id: fixedQuestionnaire.questionnaireId,
    title: fixedQuestionnaire.title,
    questions: fixedQuestionnaire.questions.map((q) => ({
      question_id: q.questionId,
      question_type: q.questionType,
      title: q.title,
      required: q.required,
    })),
  });
});

app.post('/api/submissions', (req, res) => {
  const requestId = (req as any).requestId as string;
  const { questionnaire_id, answers } = req.body || {};

  if (questionnaire_id !== FIXED_QUESTIONNAIRE_ID) {
    return res.status(400).json(errorBody('INVALID_ARGUMENT', 'Invalid questionnaire_id', requestId));
  }
  if (!Array.isArray(answers)) {
    return res.status(400).json(errorBody('INVALID_ARGUMENT', 'answers must be array', requestId));
  }

  const normalized = answers as SurveyAnswer[];
  const answerMap = new Map(normalized.map((a) => [a.questionId || (a as any).question_id, a.value]));

  for (const q of fixedQuestionnaire.questions) {
    const hasQuestion = answerMap.has(q.questionId);
    if (q.required && (!hasQuestion || !(answerMap.get(q.questionId) || '').trim())) {
      return res
        .status(400)
        .json(errorBody('REQUIRED_QUESTION_MISSING', `Required question ${q.questionId} is missing`, requestId, { question_id: q.questionId }));
    }
  }

  for (const item of normalized) {
    const qid = item.questionId || (item as any).question_id;
    if (!fixedQuestionnaire.questions.find((q) => q.questionId === qid)) {
      return res.status(400).json(errorBody('QUESTION_NOT_FOUND', `Question ${qid} not found`, requestId, { question_id: qid }));
    }
  }

  const submittedAt = new Date().toISOString();
  const responseId = nextResponseId();
  const record = addSubmission({
    responseId,
    questionnaireId: FIXED_QUESTIONNAIRE_ID,
    submittedAt,
    answers: normalized.map((a: any) => ({ questionId: a.questionId || a.question_id, value: String(a.value ?? '') })),
  });

  return res.status(201).json({
    response_id: record.responseId,
    questionnaire_id: record.questionnaireId,
    submitted_at: record.submittedAt,
    answers: record.answers.map((a) => ({ question_id: a.questionId, value: a.value })),
  });
});

app.get('/api/admin/submissions', (req, res) => {
  if (!requireAdmin(req, res)) return;
  const data = listSubmissions();
  res.json({
    items: data.map((s) => ({ response_id: s.responseId, submitted_at: s.submittedAt })),
    page: 1,
    page_size: data.length,
    total: data.length,
  });
});

app.get('/api/admin/submissions/:response_id', (req, res) => {
  if (!requireAdmin(req, res)) return;
  const requestId = (req as any).requestId as string;
  const found = getSubmission(req.params.response_id);
  if (!found) {
    return res.status(404).json(errorBody('RESPONSE_NOT_FOUND', `Response ${req.params.response_id} not found`, requestId, { response_id: req.params.response_id }));
  }
  return res.json({
    response_id: found.responseId,
    questionnaire_id: found.questionnaireId,
    submitted_at: found.submittedAt,
    answers: found.answers.map((a) => ({ question_id: a.questionId, value: a.value })),
  });
});

app.listen(port, () => {
  console.log(`survey backend ready at http://localhost:${port}`);
});
