import "dotenv/config";
import { DataSource } from "typeorm";
import { CreateSurveySubmissions1712136000000 } from "../../migrations/1712136000000-CreateSurveySubmissions.js";
import { SurveySubmission } from "../models/SurveySubmission.js";

export const appDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  extra: process.env.PGSSL_NO_VERIFY === "true" ? { ssl: { rejectUnauthorized: false } } : undefined,
  synchronize: false,
  logging: false,
  entities: [SurveySubmission],
  migrations: [CreateSurveySubmissions1712136000000]
});
