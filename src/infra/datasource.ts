import "dotenv/config";
import { DataSource } from "typeorm";
import { SurveySubmission } from "../models/SurveySubmission.js";

export const appDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: false,
  logging: false,
  entities: [SurveySubmission],
  migrations: ["migrations/*.ts"]
});
