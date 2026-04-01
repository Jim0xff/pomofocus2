import { cancelNewUser, drawRedpacket, drawRedpacketPermit, generateNewOneRedpacketPermit, generateRedpacket, generateRedpacketPermit, generateRedpacketPermitAndAgent, permitCancel, solveAndDrawRedpacket, syncTransactionHash } from "./services/redpacket_service.js";
import {getCurrencyPrice, getCurrentJackpotInfo, getRedpacketList, getUserJackpot, getUserJackpotAmountTotal, getUserParticipatedJackpot, getUserParticipatedRedpacket, jackpotBanner, jackpotList, newUserRedpacketInfo, redpacketDetail} from "./services/redpacket_query_service.js";
import { NEW_USER_REDPACKET_NFTID, REDPACKET_FACTORY_ADDRESS } from "./infra/constants.js";


export const resolvers = {
    Query: {
        getRedpacketList: async (_: any, args: any, ctx: any) => {
            if(ctx?.user?.id){
                args.input.loginUser = {
                    id: ctx?.user?.id,
                    address: ctx?.user?.ethAddress
                };
            }
            let params = args.input;
            params['orderBy'] = [
                {
                    key:"remainAmount",
                    direction: "DESC",
                }
            ];
            return await getRedpacketList(args.input);
        },

        getUserParticipatedRedpacket: async (_: any, args: any, ctx: any) => {
            const user = {
                id: ctx.user.id,
                address: ctx.user.ethAddress
            };
            
            return await getUserParticipatedRedpacket({user});
        },

        redpacketDetail: async (_: any, args: any, ctx: any) => {
            let params = {
                redpacketAddress: args.redpacketAddress
            };
            if(ctx?.user?.id){
                params['loginUser'] = {
                    id: ctx.user.id,
                    address: ctx.user.ethAddress
                }
            }
            
            return await redpacketDetail(params);
        },

        config: async (_: any, args: any, ctx: any) => {
        
            return {
                "redpacketFactoryContractAddress": REDPACKET_FACTORY_ADDRESS,
                "nftAddress":"0x888B2E00Ddd2CA459301ccEf0765DB3b10CD8198",
                "newUserNftId":NEW_USER_REDPACKET_NFTID,
                "redpacketManager":"0xd4F8bbF9c0B8AFF6D76d2C5Fa4971a36fC9e4003",
            };
        },

        newUserRedpacketInfo: async (_: any, args: any, ctx: any) => {
        
            let params = {
                user: {
                    id: ctx.user.id,
                    address: ctx.user.ethAddress
                }
            };
            return await newUserRedpacketInfo(params);
        },

        jackpotList: async (_: any, args: any, ctx: any) => {
        
            return await jackpotList();
        },


        userWinJackpotList: async (_: any, args: any, ctx: any) => {
        
            return await getUserJackpot(ctx.user.ethAddress);
        },

        jackpotBanner:  async (_: any, args: any, ctx: any) => {
        
            return await jackpotBanner();
        },

        getUserParticipatedJackpot:  async (_: any, args: any, ctx: any) => {
            const params = {
                user: {
                    id: ctx.user.id,
                    address: ctx.user.ethAddress
                }
            };
            return await getUserParticipatedJackpot(params);
        },

        getCurrentJackpotInfo:  async (_: any, args: any, ctx: any) => {
            return await getCurrentJackpotInfo();
        },

        getUserJackpotAmountTotal:  async (_: any, args: any, ctx: any) => {
            return await getUserJackpotAmountTotal(ctx.user.ethAddress);
        },

        getCurrencyPrice:  async (_: any, args: any, ctx: any) => {
            return await getCurrencyPrice("metis-token");
        },

    },
    Mutation: {
        generateRedpacketPermit:  async (_: any, args: any, ctx: any) => {
            args.input.creator = {
                id: ctx?.user?.id,
                address: ctx?.user?.ethAddress
            };
            return await generateRedpacketPermit(args.input);
        },

        generateNewOneRedpacketPermit:  async (_: any, args: any, ctx: any) => {
            args.input.creator = {
                id: ctx?.user?.id,
                address: ctx?.user?.ethAddress
            };
            return await generateNewOneRedpacketPermit(args.input);
        },

        generateRedpacketPermitAndAgent: async (_: any, args: any, ctx: any) => {
            args.input.creator = {
                id: ctx?.user?.id,
                address: ctx?.user?.ethAddress
            };
            return  generateRedpacketPermitAndAgent(args.input);
        },

        newUserCancel:  async (_: any, args: any, ctx: any) => {
            const user = {
                id: ctx?.user?.id,
                address: ctx?.user?.ethAddress
            };
            await cancelNewUser(user);
            return "OK";
        },

        syncDrawTransactionHash:  async (_: any, args: any, ctx: any) => {
            let params = {
                user: {
                    id: ctx?.user?.id,
                    address: ctx?.user?.ethAddress
                },
                itemId: args.itemId,
                transactionHash: args.transactionHash,
            }
            await syncTransactionHash(params);
            return "OK";
        },

        generateRedpacket: async (_: any, args: any, ctx: any) => {
            args.input.creator = {
                id: ctx?.user?.id,
                address: ctx?.user?.ethAddress
            };
            return await generateRedpacket(args.input);
        },

        drawRedpacket: async (_: any, args: any, ctx: any) => {
            let params = {
                user: {
                    id: ctx?.user?.id,
                    address: ctx?.user?.ethAddress
                },
                redpacketId: args.redpacketId
            }
            return await drawRedpacket(params);
        },

        solveAndDrawRedpacket: async (_: any, args: any, ctx: any) => {
            let params = {
                user: {
                    id: ctx?.user?.id,
                    address: ctx?.user?.ethAddress
                },
                redpacketId: args.redpacketId,
                answer: args.answer
            }
            return await solveAndDrawRedpacket(params);
        },

        drawRedpacketPermit: async (_: any, args: any, ctx: any) => {
            let params = {
                user: {
                    id: ctx?.user?.id,
                    address: ctx?.user?.ethAddress
                },
                itemId: args.itemId
            }
            return  await drawRedpacketPermit(params);
        },

        permitCancel:  async (_: any, args: any, ctx: any) => {
            let params = {
                user: {
                    id: ctx?.user?.id,
                    address: ctx?.user?.ethAddress
                },
                itemId: args.itemId
            }
            await permitCancel(params);
            return "OK";
        },


    }
};

function err(msg: string) {
    return { err: msg };
}
