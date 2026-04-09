import { DataSource } from 'typeorm';
import { SurveyQuestion } from '../models/surveyQuestion.js';

const DEFAULT_QUESTIONS: Array<Pick<SurveyQuestion, 'questionId' | 'questionType' | 'questionTitle' | 'required' | 'sortOrder' | 'status'>> = [
  {
    questionId: 'q_name',
    questionType: 'text',
    questionTitle: '你的姓名',
    required: true,
    sortOrder: 1,
    status: 'active'
  },
  {
    questionId: 'q_feedback',
    questionType: 'textarea',
    questionTitle: '你对活动的建议',
    required: false,
    sortOrder: 2,
    status: 'active'
  }
];

export async function seedSurveyQuestions(ds: DataSource): Promise<void> {
  const repo = ds.getRepository(SurveyQuestion);
  const count = await repo.count();
  if (count > 0) {
    return;
  }

  await repo.insert(DEFAULT_QUESTIONS);
}
