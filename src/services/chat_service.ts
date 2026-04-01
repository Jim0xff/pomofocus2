import { ADVENTURE_THEMES, DAY_IN_SECONDS, FAUCET_URL, GIFTBOX_MESSAGE_QUOTA, LEVEL_MESSAGES, MINUTE_IN_SECONDS, RECENT_CHAT_COUNT } from "../infra/constants.js";
import { getRepository } from "../infra/datasource.js";
import { AdventureType, BasicLazbubuInfo, ChatRole, ChatType, GraphQLChat, coBuildAgentStatus } from "../infra/types.js";
import { delCache, getCache, setCache, withLock } from "../infra/cache.js";
import { timeAgo } from "../infra/misc.js";
import { claimTask } from "./task_claim_service.js";

import { CoBuildAgent } from "../models/co_build_agent.js";



const LAZBUBU_REPLY_PREFIX = 'lazbubu:';
const coBuildAgentRepository = getRepository(CoBuildAgent);


export async function contributeData(userId: string, app:string, outAgentId: string, data: string) {
    //TODO contribute data api

    const coBuildAgent = await coBuildAgentRepository.findOne({where : {app, outAgentId}}) as CoBuildAgent;

    let contributeDataId = "";
    claimTask(coBuildAgent.id + "", "co-build-contribute", Number(userId), {
        taskTemplate: "coBuildContribute",
        taskUserId: userId,
        extraParams: {
          params: { userId, app, outAgentId, data },
          coBuildAgent,
          contributeDataId,
        },
      }).catch((err) => {
        console.error(`[claimTask] async execution failed:`, err);
      });
}

export async function getMyContributeData(userId: string, app:string, outAgentId?: string) {
    const coBuildAgent = await coBuildAgentRepository.findOne({where : {app, outAgentId}}) as CoBuildAgent;

    return [];
}

export async function careateCoBuildAgent(params:{
    app: string,
    outAgentId: string,
    agentName: string, 
    type: string,
    tokenAddress: string, 
    tagLine?: string, 
    description?: string, 
    greeting?: string, 
    knowledgeUrl?: string, 
    knowledgeStr?: string, 
    dayTotalLimit: number, 
    creator: string}
) {

    let coBuildAgent = new CoBuildAgent();
    coBuildAgent.app = params.app;
    coBuildAgent.name = params.agentName;
    coBuildAgent.token = params.tokenAddress;
    coBuildAgent.type = params.type;
    coBuildAgent.quota = params.dayTotalLimit;
    coBuildAgent.creator = params.creator;
    coBuildAgent.status = coBuildAgentStatus.RUN;
    coBuildAgent.outAgentId = params.outAgentId;
    let contentObj = {};
    contentObj['tagline'] = params.tagLine;
    contentObj['description'] = params.description;
    contentObj['greeting'] = params.greeting;
    contentObj['knowledgeUrl'] = params.knowledgeUrl;
    contentObj['knowledgeStr'] = params.knowledgeStr;
    coBuildAgent.content = JSON.stringify(contentObj);

    const savedAgent = coBuildAgentRepository.save(coBuildAgent);

    return savedAgent;
}

function sanitize(content: string) {
    return content.replace(/\<\/?RECENT_CHATS\>/ig, '(sanitized)').replace(/\<\/?CURRENT_MESSAGE\>/ig, '(sanitized)').replace(/\<\/?INSTRUCTIONS\>/ig, '(sanitized)').replace(/\<\/?KNOWLEDGE_BASE\>/ig, '(sanitized)').replace(/\<\/?MEMORY\>/ig, '(sanitized)');
}


export async function getChatsByShareId(shareId: string) {
    const cacheChats = await getCache(`share-chat-info:${shareId}`);
    let result = [];
    if (cacheChats) {
        result = JSON.parse(cacheChats);
    }
    return result;
}

export async function getShareInfo(shareId: string) {
    const chats = await getChatsByShareId(shareId);
    const imageUrl = await getCache(`share-image:${shareId}`);
    return { chats, imageUrl };
}
