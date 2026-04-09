import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { SurveyQuestion } from '../models/surveyQuestion.js';
import { SurveySubmission } from '../models/surveySubmission.js';
import { SurveySubmissionAnswer } from '../models/surveySubmissionAnswer.js';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: process.env.DB_PATH || './survey.sqlite',
  entities: [SurveyQuestion, SurveySubmission, SurveySubmissionAnswer],
  synchronize: true,
  logging: false
});

export async function initializeDataSource(): Promise<DataSource> {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  return AppDataSource;
}
