import { createApp } from "./app";
import { loadConfig } from "./config/env";

const config = loadConfig();
const app = createApp();

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`hackathon-signup3 backend listening on ${config.port}`);
});
