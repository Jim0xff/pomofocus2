export const apiSchema = {
  basePath: '/api',
  endpoints: {
    getSurvey: {
      method: 'GET',
      path: '/survey'
    },
    submitSurvey: {
      method: 'POST',
      path: '/survey/submissions'
    },
    listAdminSubmissions: {
      method: 'GET',
      path: '/admin/submissions'
    },
    getAdminSubmissionDetail: {
      method: 'GET',
      path: '/admin/submissions/:submissionId'
    }
  }
} as const;
