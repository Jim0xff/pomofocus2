import 'reflect-metadata';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import express, { Request } from 'express';
import http from 'http';
import cors from 'cors';
import { Request as ExpressRequest } from 'express';
import { logger, withRequestId } from './infra/logger.js';
import { randomUUID } from 'crypto';
import { initializeDatabase } from './infra/datasource.js';
import { typeDefs } from './schema.js';
import { resolvers } from './resolvers.js';
import { DISABLE_SCAN, ENV, PORT, TEST_AUTH } from './infra/constants.js';
import { asyncLocalStorage } from './infra/auth.js';
import { contributeData } from './services/chat_service.js';
import { errorHandler } from './infra/errorHandler.js';
import { UnauthorizedError, ValidationError } from './infra/HttpError.js';
import { authMiddleware } from './infra/authMiddleware.js';
import { getRemainInfo, testSign } from './services/transaction_relayer_service.js';
import { drawRedpacket, drawRedpacketPermit, generateRedpacket, generateRedpacketPermit } from './services/redpacket_service.js';
import { ethers } from 'ethers';
import { RedpacketType } from './infra/types.js';
import { jackpotList } from './services/redpacket_query_service.js';



export type AppContext = { req: ExpressRequest };

logger.info('Initializing database');
await initializeDatabase();
logger.info('Database initialized');

const loggingPlugin = {
    // Fires whenever a GraphQL request is received from a client.
    async requestDidStart(requestContext) {
        if (requestContext.request.operationName === 'IntrospectionQuery') {
            return;
        }
        logger.info('Query: ' + requestContext.request.query.replace(/\n/g, ' '));
        logger.info('Variables: ' + JSON.stringify(requestContext.request.variables));
    },
};

(BigInt.prototype as any).toJSON = function () {
    return this.toString();
};

const app = express();
const httpServer = http.createServer(app);
const server = new ApolloServer<AppContext>({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer }), loggingPlugin],
    formatError(formattedError, error) {
        logger.error(`request error: ${formattedError.message} ${error instanceof Error ? error.message : 'unknown error'}`);
        console.error(error);

        let errCode = 500;

        if (error instanceof Error && error.message.includes('Invalid token')) {
            errCode = 401;
        }

        return {
            message: formattedError.message,
            locations: formattedError.locations,
            path: formattedError.path,
            code: errCode,
            extensions: {
                code: formattedError.extensions?.code ?? 'INTERNAL_SERVER_ERROR',
                stacktrace: ENV == 'prod' ? null : formattedError.extensions?.stacktrace
            },
        };
    },
});

logger.info('Starting Apollo server');
await server.start();

// app.get('/lazbubu/notMint/:address', async (req, res) => {
//     try {
//         res.json({ data: await getNotMintRecord(), code: 200 });


//     } catch (error) {
//         res.json({ error: error.message, code: 500 });
//     }
// });


app.use(
    (req, res, next) => {
        const requestId = req.headers['x-request-id'] as string || randomUUID();
        res.setHeader('x-request-id', requestId);
        withRequestId(requestId, () => {
            const store = {
                req: req
            };
            asyncLocalStorage.run(store, next);
        });
    }
);

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(authMiddleware);



app.post('/co-build-agent/contribute.json', async (req, res, next) => {

    try {
        const user = (req as any).user;
        if (!user) {
            throw new UnauthorizedError();
        }
        const result = await contributeData(user.id, req.body.app, req.body.outAgentId, req.body.data);
        res.json({ data: result, code: 200 });
    } catch (error) {
        next(error);
    }
});


app.get('/testSign', async (req, res, next) => {

    try {

        const result = await jackpotList();
        res.json({ data: result, code: 200 });
    } catch (error) {
        next(error);
    }
});

app.get('/testSign2/:id', async (req, res, next) => {

    try {
        // bizId:string,
        // bizType:string,
        // itemNum: number,
        // totalAmount: string,
        // creator:{
        //     id: string,
        //     address: string,
        // },
        const result = await generateRedpacketPermit({
            bizId: "1",
            bizType:"redpacket_nft",
            itemNum:2,
            totalAmount: ethers.parseEther("0.1") + '',
            creator:{
                id:"36",
                address:"0xd4f8bbf9c0b8aff6d76d2c5fa4971a36fc9e4003",
            }
        });
        res.json({ data: result, code: 200 });
    } catch (error) {
        next(error);
    }
});

app.get('/testCreateRedpacket/:id', async (req, res, next) => {

    try {
        // bizId:string,
        // bizType:string,
        // itemNum: number,
        // totalAmount: string,
        // creator:{
        //     id: string,
        //     address: string,
        // },
        const result = await generateRedpacket({
            bizId:"1_0x383B5F8015dB39ba94d1c0ba9B46Dcb5166Bf1cd",
            bizType:"redpacket_nft",
            itemNum: 3,
            totalAmount: ethers.parseEther("0.1") + '',
            type: RedpacketType.MEAN,
            creator:{
                id:"36",
                address:"0xd4f8bbf9c0b8aff6d76d2c5fa4971a36fc9e4003",
            },
            transactionHash: "0xe1b1c3b1b2172e141843b4676e45f917d4871bfb750a9b9554e9c145b7a46610",
            address: "0x383B5F8015dB39ba94d1c0ba9B46Dcb5166Bf1cd",
            scope:"common"
        });
        res.json({ data: result, code: 200 });
    } catch (error) {
        next(error);
    }
});


app.get('/drawRedpacket/:id', async (req, res, next) => {

    try {
        const id = req.params.id;

        const result = await drawRedpacket({
            user:{
                id:"36",
                address:"0xd4f8bbf9c0b8aff6d76d2c5fa4971a36fc9e4003",
            },
            redpacketId: Number(id),
        });
        res.json({ data: result, code: 200 });
    } catch (error) {
        next(error);
    }
});

app.get('/testDrawPermit/:id', async (req, res, next) => {

    try {
        const id = req.params.id;

        const result = await drawRedpacketPermit({
            user:{
                id:"36",
                address:"0xd4f8bbf9c0b8aff6d76d2c5fa4971a36fc9e4003",
            },
            itemId: Number(id),
        });
        res.json({ data: result, code: 200 });
    } catch (error) {
        next(error);
    }
});

app.get('/metadata/:id.json', async (req, res, next) => {

    try {
        const id = req.params.id;
        const result = await getRemainInfo(req.query.chainId.toString(), req.query.targetToken.toString().toLowerCase());
        res.json({ data: result, code: 200 });
    } catch (error) {
        next(error);
    }
});


// app.get('/airdrop-permit', async (req, res) => {
//     try {
//         res.json({ data: await setAirdropPermit(req.query.address.toString(), req.query.activityId.toString()), code: 200 });
//     } catch (error) {
//         res.json({ error: error.message, code: 500 });
//     }
// });

app.use(
    '/graphql',
    expressMiddleware(server, {
        context: async ({ req }) => {
            // 这里 user 已经由 authMiddleware 注入
            const user = (req as any).user;
            return { req, user };
        },
    }),
);

app.use(errorHandler);





logger.info('Applying Apollo server');
await new Promise<void>((resolve) => httpServer.listen({ port: PORT }, resolve));

if (!DISABLE_SCAN) {
    // scanLoop(scanAdventures);
    //scheduleWithLock('0 0 * * *', deleteUnusedStorage);
}

logger.info(`🚀  Server ready at: http://localhost:${PORT}`);
