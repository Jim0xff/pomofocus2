export type QuestionnaireQuestion = {
  questionId: string;
  type: 'text' | 'textarea';
  prompt: string;
  required: boolean;
};

export type FixedQuestionnaire = {
  questionnaireId: string;
  title: string;
  questions: QuestionnaireQuestion[];
};

export const FIXED_QUESTIONNAIRE: FixedQuestionnaire = {
  questionnaireId: 'survey-fixed-v1',
  title: 'User Research Survey',
  questions: [
    {
      questionId: 'q1',
      type: 'text',
      prompt: 'Which feature do you use most often?',
      required: true,
    },
    {
      questionId: 'q2',
      type: 'textarea',
      prompt: 'What should we improve next?',
      required: false,
    },
  ],
};

export function getQuestionById(questionId: string) {
  return FIXED_QUESTIONNAIRE.questions.find((question) => question.questionId === questionId) ?? null;
}
