import { getQuestionnaire, submitResponse, listResponses, getResponseDetail } from './services/surveyService.js';

export const resolvers = {
  Query: {
    questionnaire: async () => getQuestionnaire(),
    adminResponses: async (_: unknown, args: { page?: number; page_size?: number }) => listResponses(args.page ?? 1, args.page_size ?? 20),
    adminResponseDetail: async (_: unknown, args: { response_id: string }) => getResponseDetail(args.response_id)
  },
  Mutation: {
    submitResponse: async (_: unknown, args: { input: { questionnaire_id: string; answers: Array<{question_id: string; answer: string}> } }) => submitResponse(args.input.questionnaire_id, args.input.answers)
  }
};
