import 'dotenv/config';
import http from 'http';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { typeDefs } from './schema.js';
import { resolvers } from './resolvers.js';
import { initializeDatabase } from './infra/datasource.js';
import { createApp } from './app.js';

const PORT = Number(process.env.PORT || 3000);
await initializeDatabase();
const app = createApp();
const httpServer = http.createServer(app);

const server = new ApolloServer({ typeDefs, resolvers, plugins: [ApolloServerPluginDrainHttpServer({ httpServer })] });
await server.start();
app.use('/graphql', expressMiddleware(server) as any);

await new Promise<void>((resolve) => httpServer.listen({ port: PORT }, resolve));
console.log(`survey-jim9 server listening on :${PORT}`);
