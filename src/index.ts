import { appDataSource } from "./infra/datasource.js";

const bootstrap = async (): Promise<void> => {
  if (!process.env.DATABASE_URL) {
    console.log("DATABASE_URL is not set, skip datasource initialize in local bootstrap");
    return;
  }
  await appDataSource.initialize();
  console.log("survey-jim5 backend datasource initialized");
};
bootstrap().catch((error) => { console.error(error); process.exit(1); });
