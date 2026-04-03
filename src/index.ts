import { startServer } from "./api/server.js";
startServer().catch((error) => { console.error(error); process.exit(1); });
