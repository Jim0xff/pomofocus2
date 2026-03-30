import 'dotenv/config';
import { createApp } from './app.js';
import { AppDataSource } from './infra/datasource.js';
import { ensureAdminSeed } from './services/bootstrapAdminService.js';

const app = createApp();
const port = Number(process.env.PORT || 3000);

AppDataSource.initialize()
  .then(async () => {
    await ensureAdminSeed();
    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`hackathon-signup2 backend listening on ${port}`);
    });
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('failed to init datasource', error);
    process.exit(1);
  });
