import { EntitySchema } from 'typeorm';

export interface QuestionnaireRow { id: number; questionnaireId: string; title: string; status: string; createdAt: Date; updatedAt: Date; }
export interface QuestionnaireQuestionRow { id: number; questionnaireRefId: number; questionId: string; title: string; type: string; options: string | null; required: boolean; displayOrder: number; createdAt: Date; updatedAt: Date; }
export interface SurveySubmissionRow { id: number; submissionId: string; questionnaireId: string; submittedAt: Date; createdAt: Date; updatedAt: Date; }
export interface SurveySubmissionAnswerRow { id: number; submissionId: string; questionId: string; answerValue: string; createdAt: Date; updatedAt: Date; }

export const QuestionnaireEntity = new EntitySchema<QuestionnaireRow>({
  name: 'questionnaire',
  columns: {
    id: { type: Number, primary: true, generated: true },
    questionnaireId: { type: String, unique: true },
    title: { type: String },
    status: { type: String, default: 'active' },
    createdAt: { type: Date, createDate: true },
    updatedAt: { type: Date, updateDate: true }
  }
});

export const QuestionnaireQuestionEntity = new EntitySchema<QuestionnaireQuestionRow>({
  name: 'questionnaireQuestion',
  columns: {
    id: { type: Number, primary: true, generated: true },
    questionnaireRefId: { type: Number },
    questionId: { type: String },
    title: { type: String },
    type: { type: String },
    options: { type: String, nullable: true },
    required: { type: Boolean, default: true },
    displayOrder: { type: Number },
    createdAt: { type: Date, createDate: true },
    updatedAt: { type: Date, updateDate: true }
  },
  indices: [{ name: 'idxQuestionnaireQuestionDisplay', columns: ['questionnaireRefId', 'displayOrder'] }],
  uniques: [{ name: 'uqQuestionnaireQuestionUnique', columns: ['questionnaireRefId', 'questionId'] }]
});

export const SurveySubmissionEntity = new EntitySchema<SurveySubmissionRow>({
  name: 'surveySubmission',
  columns: {
    id: { type: Number, primary: true, generated: true },
    submissionId: { type: String, unique: true },
    questionnaireId: { type: String },
    submittedAt: { type: Date },
    createdAt: { type: Date, createDate: true },
    updatedAt: { type: Date, updateDate: true }
  },
  indices: [{ name: 'idxSurveySubmissionSubmittedAt', columns: ['submittedAt'] }]
});

export const SurveySubmissionAnswerEntity = new EntitySchema<SurveySubmissionAnswerRow>({
  name: 'surveySubmissionAnswer',
  columns: {
    id: { type: Number, primary: true, generated: true },
    submissionId: { type: String },
    questionId: { type: String },
    answerValue: { type: String },
    createdAt: { type: Date, createDate: true },
    updatedAt: { type: Date, updateDate: true }
  },
  indices: [{ name: 'idxSurveySubmissionAnswerSubmissionId', columns: ['submissionId'] }],
  uniques: [{ name: 'uqSurveySubmissionAnswerUnique', columns: ['submissionId', 'questionId'] }]
});
