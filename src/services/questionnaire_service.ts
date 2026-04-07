import { appDataSource } from '../infra/datasource.js';
import { QuestionnaireEntity, QuestionnaireQuestionEntity } from '../models/entities.js';

export async function getFixedQuestionnaire() {
  const questionnaireRepo = appDataSource.getRepository(QuestionnaireEntity);
  const questionRepo = appDataSource.getRepository(QuestionnaireQuestionEntity);
  const questionnaire = await questionnaireRepo.findOneByOrFail({ questionnaireId: 'fixed-survey-v1' } as any);
  const questions = await questionRepo.findBy({ questionnaireRefId: (questionnaire as any).id } as any);
  questions.sort((a: any, b: any) => a.displayOrder - b.displayOrder);
  return {
    questionnaireId: (questionnaire as any).questionnaireId,
    questions: questions.map((q: any) => ({
      questionId: q.questionId,
      title: q.title,
      type: q.type,
      options: q.options ? JSON.parse(q.options) : null,
      required: q.required
    }))
  };
}
