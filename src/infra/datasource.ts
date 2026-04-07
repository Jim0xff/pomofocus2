import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Questionnaire } from '../models/Questionnaire.js';
import { QuestionnaireQuestion } from '../models/QuestionnaireQuestion.js';
import { SurveyResponse } from '../models/SurveyResponse.js';
import { SurveyResponseAnswer } from '../models/SurveyResponseAnswer.js';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: process.env.DB_PATH || 'survey.db',
  synchronize: true,
  entities: [Questionnaire, QuestionnaireQuestion, SurveyResponse, SurveyResponseAnswer]
});

export async function initializeDatabase(): Promise<void> {
  if (!AppDataSource.isInitialized) await AppDataSource.initialize();
  const questionnaireRepo = AppDataSource.getRepository(Questionnaire);
  const questionRepo = AppDataSource.getRepository(QuestionnaireQuestion);
  let q = await questionnaireRepo.findOne({ where: { questionnaireId: 'fixed-survey-v1' } });
  if (!q) {
    q = await questionnaireRepo.save({ questionnaireId: 'fixed-survey-v1', title: 'Fixed Survey', status: 'active' });
    await questionRepo.save([
      { questionnaireRefId: q.id, questionId: 'q_name', questionText: '你的名字是？', questionType: 'text', required: true, displayOrder: 1 },
      { questionnaireRefId: q.id, questionId: 'q_feedback', questionText: '请留下反馈', questionType: 'textarea', required: false, displayOrder: 2 }
    ]);
  }
}
