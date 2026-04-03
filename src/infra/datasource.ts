import "dotenv/config";
import { DataSource } from "typeorm";
import { CreateSurveySubmissions1712136000000 } from "../../migrations/1712136000000-CreateSurveySubmissions.js";
import { SurveySubmission } from "../models/SurveySubmission.js";

const databaseUrl = process.env.DATABASE_URL;
const pgSslNoVerify = process.env.PGSSL_NO_VERIFY === "true";
const sslModeRequire = /sslmode=require/i.test(databaseUrl ?? "");
const useInsecureSsl = pgSslNoVerify || sslModeRequire;

if (useInsecureSsl) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

export const appDataSource = new DataSource({
  type: "postgres",
  url: databaseUrl,
  ssl: useInsecureSsl ? { rejectUnauthorized: false } : undefined,
  extra: useInsecureSsl ? { ssl: { rejectUnauthorized: false } } : undefined,
  synchronize: false,
  logging: false,
  entities: [SurveySubmission],
  migrations: [CreateSurveySubmissions1712136000000]
});
