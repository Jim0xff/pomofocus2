export const typeDefs = `#graphql
  scalar JSON

  type QuestionnaireQuestion {
    questionId: String!
    type: String!
    prompt: String!
    required: Boolean!
  }

  type FixedQuestionnaire {
    questionnaireId: String!
    title: String!
    questions: [QuestionnaireQuestion!]!
  }

  type SurveyAnswer {
    questionId: String!
    answerText: String!
  }

  type SurveySubmission {
    submissionId: ID!
    questionnaireId: String!
    submittedAt: String!
    answers: [SurveyAnswer!]!
  }

  type SurveySubmissionPage {
    items: [SurveySubmission!]!
    page: Int!
    pageSize: Int!
    total: Int!
  }

  input SurveyAnswerInput {
    questionId: String!
    answerText: String!
  }

  input SubmitSurveySubmissionInput {
    questionnaireId: String!
    answers: [SurveyAnswerInput!]!
  }

  type FixedQuestionnaireResponse {
    requestId: String!
    code: Int!
    message: String!
    data: FixedQuestionnaire
    details: JSON
  }

  type SubmitSurveySubmissionResponse {
    requestId: String!
    code: Int!
    message: String!
    data: SurveySubmission
    details: JSON
  }

  type AdminSurveySubmissionsResponse {
    requestId: String!
    code: Int!
    message: String!
    data: SurveySubmissionPage
    details: JSON
  }

  type AdminSurveySubmissionResponse {
    requestId: String!
    code: Int!
    message: String!
    data: SurveySubmission
    details: JSON
  }

  type Query {
    fixedQuestionnaire: FixedQuestionnaireResponse!
    adminSurveySubmissions(page: Int, pageSize: Int): AdminSurveySubmissionsResponse!
    adminSurveySubmission(submissionId: ID!): AdminSurveySubmissionResponse!
  }

  type Mutation {
    submitSurveySubmission(input: SubmitSurveySubmissionInput!): SubmitSurveySubmissionResponse!
  }
`;
