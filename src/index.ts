import { initializeDatabase } from './infra/datasource.js';
import { createApp } from './app.js';

await initializeDatabase();
const app = await createApp();
const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`server ready on :${port}`));
