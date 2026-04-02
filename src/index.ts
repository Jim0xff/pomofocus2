import 'dotenv/config';
import { logger } from './infra/logger.js';
import { createApp } from './app.js';

const app = createApp();
const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  logger.info({ message: 'server_started', port });
});
