import { SurveyService } from './services/surveyService.js';

export function buildResolvers(service: SurveyService) {
  return {
    survey: {
      getSurvey: () => service.getSurvey(),
      submitSurvey: (payload: unknown) => service.submitSurvey(payload)
    },
    admin: {
      listSubmissions: () => service.listAdminSubmissions(),
      getSubmissionDetail: (submissionId: string) => service.getAdminSubmissionDetail(submissionId)
    }
  };
}
