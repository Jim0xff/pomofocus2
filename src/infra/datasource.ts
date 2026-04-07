import { DataSource } from 'typeorm';
import { QuestionnaireEntity, QuestionnaireQuestionEntity, SurveySubmissionAnswerEntity, SurveySubmissionEntity } from '../models/entities.js';

export const appDataSource = new DataSource({
  type: 'sqljs',
  entities: [QuestionnaireEntity, QuestionnaireQuestionEntity, SurveySubmissionEntity, SurveySubmissionAnswerEntity],
  synchronize: true,
  logging: false
});

export async function initializeDatabase() {
  if (!appDataSource.isInitialized) {
    await appDataSource.initialize();
    await seedQuestionnaire();
  }
}

async function seedQuestionnaire() {
  const questionnaireRepo = appDataSource.getRepository(QuestionnaireEntity);
  const questionRepo = appDataSource.getRepository(QuestionnaireQuestionEntity);
  const existing = await questionnaireRepo.findOneBy({ questionnaireId: 'fixed-survey-v1' } as any);
  if (existing) return;

  const saved = await questionnaireRepo.save({ questionnaireId: 'fixed-survey-v1', title: '固定问卷 V1', status: 'active' } as any);
  await questionRepo.save([
    { questionnaireRefId: (saved as any).id, questionId: 'q_name', title: '你的名字是？', type: 'text', options: null, required: true, displayOrder: 1 },
    { questionnaireRefId: (saved as any).id, questionId: 'q_feedback', title: '请填写你的反馈', type: 'textarea', options: null, required: true, displayOrder: 2 }
  ] as any);
}
