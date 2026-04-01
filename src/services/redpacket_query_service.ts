import { In } from "typeorm";
import { getRepository , getDataSource} from "../infra/datasource.js";
import { RedPacket } from "../models/redpacket.js";
import { RedPacketItem } from "../models/redpacket_item.js";
import { HttpError } from "../infra/HttpError.js";
import { queryChallenge } from "./redpacket_agent_client.js";
import { COING_GECKO_URL, METIS_RPC_URL, NEW_USER_REDPACKET_NFTID, REDPACKET_FACTORY_ADDRESS, RPC_URL } from "../infra/constants.js";
import { queryJackpotList, queryJackpotListByJackpotIds, queryJackpotListByUserAddress, queryUserJackpotRedpackets } from "./subgraph_client.js";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const RedpacketFactoryABI = require("../abis/RedpacketFactory.json");


const redpacketRepository = getRepository(RedPacket);
const redpacketItemRepository = getRepository(RedPacketItem);

import { ethers } from "ethers";
import { getCache, setCache } from "../infra/cache.js";


const CONTRACT_ADDRESS = "0xYourContractAddress";

const provider = new ethers.JsonRpcProvider(METIS_RPC_URL);
const contract = new ethers.Contract(REDPACKET_FACTORY_ADDRESS, RedpacketFactoryABI, provider);

export async function getCurrentJackpotCountOnContract() {
   const jackpotCnt = await contract.jackpotCnt();
   return jackpotCnt.toString();
}


export async function getCurrentJackpotAmount() {
  const jackpotAmount = await contract.jackpotAmount();
  return jackpotAmount.toString();
}

export async function currentJackpotId() {
  const jackpotId = await contract.jackpotId();
  return jackpotId.toString();
}

export async function getCurrentJackpotInfo() {
   const cacheRt = await getCache("CURRENT_JACKPOT_INFO");
   if(cacheRt){
      return JSON.parse(cacheRt);
   }
   const jackpotCnt = await getCurrentJackpotCountOnContract();
   const targetCnt = 100;
   const jackpotAmount = await getCurrentJackpotAmount();
   const jackpotId = await currentJackpotId();
   const rt = {
    jackpotCnt, jackpotAmount, jackpotId, targetCnt
   };
   await setCache("CURRENT_JACKPOT_INFO", JSON.stringify(rt), 300);
   return rt;
}

export async function getRedpacketList(params:{
    creator?:{
        id:string,
        address:string,
    },
    status?:string,
    scope?:string,
    ids?:[number],
    pageNum:number,
    pageSize:number,
    loginUser?:{
        id:string,
        address:string,
    },
    orderBy?:[{
      key:string,
      direction:"ASC" | "DESC",
    }],
}){
  const pageNum = Math.max(1, Math.trunc(params.pageNum || 1));
  const pageSize = Math.min(100, Math.max(1, Math.trunc(params.pageSize || 100))); 
  const skip = (pageNum - 1) * pageSize;
  const qb =  redpacketRepository.createQueryBuilder('rp');
   // status 过滤（可选）
  if (params.status) {
    qb.andWhere(`rp."status" = :status`, { status: params.status });
  }
  if (params.scope) {
    qb.andWhere(`rp."scope" = :scope`, { scope: params.scope });
  }
  if(params.creator) {
    qb.andWhere(`rp."creatorId" = :creatorId`, { creatorId: params.creator.id });
  }
  if(params.ids && params.ids.length > 0){
    qb.andWhere(`rp."id" IN (:...ids)`, { ids: params.ids });
  }
  if(params.orderBy && params.orderBy.length > 0){
    for (let i = 0; i < params.orderBy.length; i++) {
      const { key, direction } = params.orderBy[i];
  
      // 最小限度防炸：不算白名单，只限制 key 只能是字母数字下划线和点（支持 rp.xxx 或 xxx）
      const safeKey = String(key).trim();
      if (!/^[a-zA-Z0-9_.]+$/.test(safeKey)) continue;
      const pureCol = safeKey.includes(".") ? safeKey.split(".").pop()! : safeKey;
      qb.addOrderBy(`rp."${pureCol}"`, direction);
    }
  }
  
  qb.addOrderBy(`rp."id"`, "DESC"); 

  // 分页
  qb.skip(skip).take(pageSize);

  let [list, total] = await qb.getManyAndCount();
  if(total > 0){
    const redpacketIds = list.map((rp) => rp.id);
    const items = await redpacketItemRepository.find({
        where: {
          redpacketId: In(redpacketIds as any),
        },
        order: { id: "DESC" }, 
      });
      // 分组：redpacketId => items[]
    let itemMap = new Map<number, any[]>();
    let drawedMap = new Map<number, boolean>();
    for (const it of items) {
      const key = it.redpacketId;
      if(params.loginUser){
        if(it.userId == params.loginUser?.id){
            drawedMap.set(key, true);
        }
      }

      const arr = itemMap.get(key);
      if (arr) arr.push(it);
      else itemMap.set(key, [it]);
    }

    // 组装返回：给每个 rp 挂上 items
    const listWithItems = list.map((rp) => ({
       ...rp,
       items: itemMap.get(rp.id as any as number) ?? [],
       canDraw: params.loginUser && !drawedMap.get(rp.id as number) ? true : false,
       agentInfo: JSON.parse(rp.content) ? JSON.parse(rp.content)?.agentInfo: null
     }));
     list = listWithItems;
  }
  return {list, total};
}


export async function redpacketDetail(params:{
    redpacketAddress: string
    loginUser?:{
        id:string,
        address:string,
    }
}) {
   const redpacketRaw = await redpacketRepository.findOne({
    where: {
        address: params.redpacketAddress,
    }
   }); 
   if(!redpacketRaw){
     throw new HttpError(404, "redpacketNotfound"); 
   }
   const redpackets = await getRedpacketList({
    loginUser:params.loginUser,
    ids:[redpacketRaw.id],
    pageNum:1,
    pageSize:1,
   });
   let redpacketSingle = redpackets.list[0];
   if(params.loginUser){
     const challengeInfo = await queryChallenge({
        agentId: redpacketRaw.agentId,
        redpacketAddress: redpacketRaw.address,
        user: params.loginUser,
     });
     redpacketSingle['challenge'] = challengeInfo;
   }
   return redpacketSingle;
}

export async function getUserParticipatedRedpacket(params:{
    user:{
        id:string,
        address:string,
    }
}) {
    const items = await redpacketItemRepository.find({
        where: {
          userId: params.user.id,
        },
        order: { id: "DESC" }, 
        
      });
    let result = [];

    if(items.length > 0){
        let redpacketIds = [];
        let itemMap = new Map<number, any[]>();
        for(const item of items){
            redpacketIds.push(item.redpacketId);
            const key = item.redpacketId;
            const arr = itemMap.get(key);
            if (arr) arr.push(item);
            else itemMap.set(key, [item]);
        }

        let rpMap = new Map<number, any>();

        const rpList = await redpacketRepository.find({
            where: {
                id: In(redpacketIds as any),
              },
        });

        if(rpList.length > 0){
            for(const rpSingle of rpList){
                const key = rpSingle.id;
                const arr = rpMap.get(key);
                const contentObj = JSON.parse(rpSingle.content);
                const agentInfo = contentObj?.agentInfo??null;
                rpSingle['agentInfo'] = agentInfo;
                rpMap.set(key, rpSingle);
            }
        }
        for(const item of items){
            let rtSingle = rpMap.get(item.redpacketId);
            rtSingle['items'] = [item];
            result.push(rtSingle);
        }

    }
    return result;
}

export async function newUserRedpacketInfo(params:{
    user:{
        id:string,
        address:string,
    }
}) {
    const redpacketRaw = await redpacketRepository.findOne({
        where: {
            creatorId: params.user.id,
            agentId: NEW_USER_REDPACKET_NFTID
        }
       }); 
    if(redpacketRaw){
        return {
            address:redpacketRaw.address
        }
    }
    return null;   
}

export async function jackpotList() {
  const jackpotList = await queryJackpotList(300);
  return jackpotList;
}

export async function jackpotBanner() {
  const items = await redpacketItemRepository
  .createQueryBuilder("item")
  .distinctOn(["item.userId"])
  .orderBy("item.userId")
  .addOrderBy("item.id", "DESC") // 每个 userId 取最新一条
  .take(30)
  .getMany();

  return items;
}

export async function getUserParticipatedJackpot(params:{
  user:{
      id:string,
      address:string,
  }
}) {
  let rt = [];
  const redpacketRaw = await queryUserJackpotRedpackets(params.user.address);
  if(redpacketRaw.length > 0){
    const lastCompleteJackpot = await queryJackpotList(1);
    let newestJackpotId = 0n;
    if(lastCompleteJackpot.length > 0){
      newestJackpotId = BigInt(lastCompleteJackpot[0].jackpotId) + 1n;
    }
    const redpacketAddressList = redpacketRaw.map((rp) => rp.redpacketAddress);
    const jackpotIds = redpacketRaw.map((rp) => Number(rp.jackpotId));

    const redpacketDbList = await redpacketRepository.find({where:{
       address: In(redpacketAddressList)
    }})
    let rpDbMap =  new Map<string, any>();

    if(redpacketDbList.length > 0){
       for(let rpSingle of redpacketDbList){
         const contentObj = JSON.parse(rpSingle.content);
         const agentInfo = contentObj?.agentInfo??null;
         rpSingle['agentInfo'] = agentInfo;
         rpDbMap.set(rpSingle.address, rpSingle);
       }
    }


    const jackpotInfo = await queryJackpotListByJackpotIds(jackpotIds);
    let jackpotMap = new Map<number, any>();
    if(jackpotInfo.length > 0){
       for(const jackpotSingle of jackpotInfo){
        jackpotMap.set(jackpotSingle.jackpotId, jackpotSingle);
      }
    }
    console.log("newwwww:" + newestJackpotId);
    for(const redpacketSingle of redpacketRaw){
       let rtSingle = {};
       rtSingle['jackpotId'] = redpacketSingle.jackpotId;
       rtSingle['status'] = "NOT_WON"
       rtSingle['nowCnt'] = 100;
       rtSingle['targetCnt'] = 100;
       if(redpacketSingle.jackpotId == newestJackpotId){
          rtSingle['status'] = "ON_GOING";
          const nowCnt = await getCurrentJackpotCountOnContract();
          rtSingle['nowCnt'] = nowCnt;
       }
       if(jackpotMap.get(redpacketSingle.jackpotId)){
        if(jackpotMap.get(redpacketSingle.jackpotId).redpacketAddress == redpacketSingle.redpacketAddress){
          rtSingle['status'] = "WON";
        }
       }
       //0xb15f59a178cce1b6388be6a8cf21029ae7631753
       if(rpDbMap.get(redpacketSingle.redpacketAddress)){
         rtSingle['agentInfo'] = rpDbMap.get(redpacketSingle.redpacketAddress).agentInfo;
       }

       rtSingle['createTimestamp'] = redpacketSingle.createTimestamp;
       rt.push(rtSingle);
    }
  }
  return rt;
}

export async function getUserJackpotAmountTotal(userAddres:string) {
  const listRaw = await queryJackpotListByUserAddress(userAddres);
  let totalAmount = 0n;
  if(listRaw.length > 0){
     for(const listSingle of listRaw){
      totalAmount += BigInt(listSingle.jackpotAmount);
     }
  }
  return totalAmount.toString();
}

export async function getUserJackpot(userAddres:string) {
  const jackpotList = await queryJackpotListByUserAddress(userAddres);
  return jackpotList;
}


export async function getCurrencyPrice(tokenId: string) {

  const cacheRt = await getCache("PRICE_USD_ON_CHAIN_" + tokenId);

  if (cacheRt) {
      return cacheRt
  }
  const response = await fetch(COING_GECKO_URL + "api/v3/simple/price?ids=" + tokenId + "&vs_currencies=usd", {
      method: 'GET',
      headers: {
          'accept': 'application/json',
          'x-cg-pro-api-key': 'CG-mFGSYCYrCQ2kWg4XF9PBZWSj'
      },
  });
  const data = await response.json();
  if(data[tokenId] == null){
    throw new HttpError(404, "currency info not found");
  }
  
  await setCache("PRICE_USD_ON_CHAIN_" + tokenId, data[tokenId]['usd'], 1500);
  return data[tokenId]['usd'];
}

