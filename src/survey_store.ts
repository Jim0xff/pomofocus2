export type SurveyQuestion = {
  questionId: string;
  questionType: 'single_line_text' | 'multi_line_text';
  title: string;
  required: boolean;
};

export type SurveyAnswer = {
  questionId: string;
  value: string;
};

export type SurveySubmission = {
  responseId: string;
  questionnaireId: string;
  submittedAt: string;
  answers: SurveyAnswer[];
};

export const FIXED_QUESTIONNAIRE_ID = 'fixed-survey-v1';

export const fixedQuestionnaire = {
  questionnaireId: FIXED_QUESTIONNAIRE_ID,
  title: '用户反馈问卷',
  questions: [
    { questionId: 'q_name', questionType: 'single_line_text', title: '你的昵称', required: true },
    { questionId: 'q_feedback', questionType: 'multi_line_text', title: '你对产品的建议', required: false },
  ] as SurveyQuestion[],
};

const submissions: SurveySubmission[] = [];

export function nextResponseId(now = new Date()): string {
  const stamp = now.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  return `resp_${stamp}_${String(submissions.length + 1).padStart(4, '0')}`;
}

export function addSubmission(item: SurveySubmission): SurveySubmission {
  submissions.push(item);
  return item;
}

export function listSubmissions(): SurveySubmission[] {
  return [...submissions].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export function getSubmission(responseId: string): SurveySubmission | undefined {
  return submissions.find((s) => s.responseId === responseId);
}
