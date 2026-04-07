export type QuestionType = 'text' | 'textarea' | 'radio';
export interface QuestionnaireQuestion { questionId: string; title: string; type: QuestionType; options: string[] | null; required: boolean; displayOrder: number; }
export interface Questionnaire { questionnaireId: string; title: string; questions: QuestionnaireQuestion[]; }
export interface SubmissionAnswer { questionId: string; answerValue: string; }
export interface Submission { submissionId: string; questionnaireId: string; submittedAt: string; answers: SubmissionAnswer[]; }
