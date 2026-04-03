import { Repository } from "typeorm";
import { SurveySubmission } from "../models/SurveySubmission.js";
import { appDataSource } from "../infra/datasource.js";

export const surveySubmissionRepository = (): Repository<SurveySubmission> => appDataSource.getRepository(SurveySubmission);
export const listSubmissionsDesc = async (): Promise<SurveySubmission[]> => surveySubmissionRepository().find({ order: { submittedAt: "DESC", id: "DESC" } });
export const findSubmissionById = async (id: string): Promise<SurveySubmission | null> => surveySubmissionRepository().findOne({ where: { id } });
