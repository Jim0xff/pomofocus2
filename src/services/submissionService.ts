import { randomUUID } from "node:crypto";
import { FIXED_QUESTIONNAIRE } from "../config/questionnaire.js";
import { surveySubmissionRepository } from "../repositories/surveySubmissionRepository.js";
import { SurveySubmission } from "../models/SurveySubmission.js";

export interface CreateSubmissionInput { questionnaireId: string; answers: Record<string, string>; submitterMeta?: Record<string, unknown>; }

export const validateSubmissionInput = (input: CreateSubmissionInput): void => {
  if (input.questionnaireId !== FIXED_QUESTIONNAIRE.id) throw new Error("QUESTIONNAIRE_NOT_FOUND");
  for (const question of FIXED_QUESTIONNAIRE.questions) {
    if (!question.required) continue;
    const value = input.answers[question.id];
    if (typeof value !== "string" || value.trim() === "") throw new Error(`INVALID_REQUEST:${question.id}`);
  }
};

export const persistSubmission = async (input: CreateSubmissionInput): Promise<SurveySubmission> => {
  validateSubmissionInput(input);
  const entity = surveySubmissionRepository().create({
    id: `subm_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
    questionnaireId: input.questionnaireId,
    answers: input.answers,
    submittedAt: new Date(),
    submitterMeta: input.submitterMeta ?? null
  });
  return surveySubmissionRepository().save(entity);
};
