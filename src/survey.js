export const FIXED_SURVEY = Object.freeze([
  {
    question_id: 'q_name',
    title: '你的姓名是？',
    type: 'text',
    required: true,
    order: 1,
  },
  {
    question_id: 'q_feedback',
    title: '你最想改进的点是什么？',
    type: 'multiline',
    required: false,
    order: 2,
  },
]);

export function getFixedSurvey() {
  return FIXED_SURVEY.map((question) => ({ ...question }));
}
