export type QuestionType = "text" | "textarea";
export interface SurveyQuestion { id: string; type: QuestionType; label: string; required: boolean; }
export interface FixedQuestionnaire { id: string; title: string; questions: SurveyQuestion[]; }
export const FIXED_QUESTIONNAIRE: FixedQuestionnaire = {
  id: "fixed-survey-v1",
  title: "用户反馈问卷",
  questions: [
    { id: "q1", type: "text", label: "你的姓名", required: true },
    { id: "q2", type: "textarea", label: "你最想改进的点", required: true }
  ]
};
