export const typeDefs = `#graphql
  type Query {
    questionnaire: QuestionnairePayload!
    adminResponses(page: Int, page_size: Int): ResponseListPayload!
    adminResponseDetail(response_id: String!): ResponseDetailPayload!
  }

  type Mutation {
    submitResponse(input: SubmitResponseInput!): SubmitResponsePayload!
  }

  input SubmitResponseInput {
    questionnaire_id: String!
    answers: [AnswerInput!]!
  }

  input AnswerInput {
    question_id: String!
    answer: String!
  }

  type QuestionnairePayload {
    questionnaire_id: String!
    questions: [Question!]!
  }

  type Question {
    question_id: String!
    question_text: String!
    question_type: String!
    required: Boolean!
  }

  type SubmitResponsePayload {
    response_id: String!
    submitted_at: String!
    answers: [Answer!]!
  }

  type ResponseListPayload {
    items: [ResponseItem!]!
    pagination: Pagination!
  }

  type ResponseItem {
    response_id: String!
    submitted_at: String!
  }

  type ResponseDetailPayload {
    response_id: String!
    submitted_at: String!
    answers: [Answer!]!
  }

  type Answer {
    question_id: String!
    answer: String!
  }

  type Pagination {
    page: Int!
    page_size: Int!
    total: Int!
  }
`;
