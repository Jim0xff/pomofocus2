import { Http } from "winston/lib/winston/transports/index.js";
import { getRepository , getDataSource} from "../infra/datasource.js";
import { RedPacket } from "../models/redpacket.js";
import { RedPacketItem } from "../models/redpacket_item.js";
import { HttpError } from "../infra/HttpError.js";
import { consumeBudget, createBudget } from "./budget_service.js";
import { createAgent, queryAgent, queryChallenge, solveChallenge } from "./redpacket_agent_client.js";

import { BudgetType, RedpacketType } from "../infra/types.js";
import { HOUR_IN_SECONDS, JACKPOT_FEE_RATE, METIS_ADDRESS, METIS_PRIVATE_KEY, SERVICE_FEE_RATE } from "../infra/constants.js";
import { BigNumberish, Signer, Wallet, ethers, getBytes, hexlify, randomBytes, solidityPackedKeccak256 } from "ethers";
import { randomInt } from "crypto";
import { getCache, setCache } from "../infra/cache.js";


const redpacketRepository = getRepository(RedPacket);
const redpacketItemRepository = getRepository(RedPacketItem);
const signerMetis = new Wallet(METIS_PRIVATE_KEY);

const NEW_USER_PREFIX = "NEW_USER__";

const ds = getDataSource();
export async function generateRedpacket(params:{
    bizId:string,
    bizType:string,
    itemNum: number,
    totalAmount: string,
    type: RedpacketType,
    creator:{
        id: string,
        address: string,
    },
    transactionHash: string,
    address: string,
    scope: string
}) {
    return await ds.transaction(
        "READ COMMITTED",
        async (manager) => {
            if(params.itemNum > 10 || params.itemNum < 2){
                throw new HttpError(403, "itemNum invalid");
            }
            params.address = params.address.toLowerCase();
            const now = Date.now();
            const expire = Math.floor((now + 60 * 60 * 1000 * 365 * 24));
            const serviceFee = BigInt(params.totalAmount) * BigInt(SERVICE_FEE_RATE) / 10000n;
            const jackpotFee = BigInt(params.totalAmount) * BigInt(JACKPOT_FEE_RATE) / 10000n;
            const realTotalAmount = BigInt(params.totalAmount) - serviceFee - jackpotFee;
            let redpacket = new RedPacket();
            const nftId = params.bizId;
            const agentInfo = await queryAgent(Number(nftId));
            if(!agentInfo){
                throw new HttpError(404, "agent not fund");
            }
            let contentObj = {};
            contentObj['agentInfo'] = agentInfo;
            redpacket.bizId = params.bizId + '_' + params.address;
            redpacket.bizType = params.bizType;
            redpacket.content = JSON.stringify(contentObj);
            redpacket.creatorAddres = params.creator.address;
            redpacket.address = params.address;
            redpacket.creatorId = params.creator.id;
            redpacket.startedAt = new Date();
            redpacket.endedAt = new Date(expire);
            redpacket.remainAmount = realTotalAmount + '';
            redpacket.totalAmount = realTotalAmount + '';
            redpacket.transactionHash = params.transactionHash;
            redpacket.totalCount = params.itemNum;
            redpacket.usedCount = 0;
            redpacket.agentId = Number(nftId);
            redpacket.type = params.type;
            redpacket.status = "valid";
            redpacket.scope = params.scope;
            let savedRedpacket = await manager.save(RedPacket, redpacket);

            const budgetId = await createBudget({
                bizId: savedRedpacket.id + '',
                bizType: 'redpacket',
                creator: params.creator,
                type: BudgetType.ENTIRETY,
                totalAmount: realTotalAmount + '', 
            });

            savedRedpacket.budgetId = budgetId;
            return await manager.save(savedRedpacket);
        }
    );
}

export async function generateRedpacketPermitAndAgent(params:{
    agentName:string,
    desc:string,
    imageId:string,
    bizType:string,
    itemNum: number,
    totalAmount: string,
    type: RedpacketType,
    creator:{
        id: string,
        address: string,
    },
}) {
    const createAgentRt = await createAgent({
        agentName: params.agentName,
        description: params.desc,
        imageId: params.imageId,
        user:params.creator,
    });
    console.log("createAgentRt is %s", createAgentRt);

    const redpacketPermit = await generateRedpacketPermit({
        bizId: createAgentRt.id,
        bizType: params.bizType,
        itemNum: params.itemNum,
        totalAmount: params.totalAmount,
        creator: params.creator
    });
    redpacketPermit['signature'] = createAgentRt.signature;
    redpacketPermit['bizId'] = createAgentRt.id;
    redpacketPermit['deadline'] = createAgentRt.deadline;
    return redpacketPermit;
}

export async function generateRedpacketPermit(params:{
    bizId:string,
    bizType:string,
    itemNum: number,
    totalAmount: string,
    creator:{
        id: string,
        address: string,
    },
}) {
    let token = {};
    token['address'] = METIS_ADDRESS;
    token['decimals'] = "18";
    let status = "live";
    let permit = null;
    //abi.encodePacked(nftId, amount, count, currencyToken)
    const now = Date.now();
    const redpacketId = Number(randomInt(1,  100000))
    const expire = Math.floor((now + 60 * 60 * 1000) / 1000);
    const dataHash = solidityPackedKeccak256(['uint256','uint256', 'uint256', 'address', 'uint256'], [params.bizId, params.totalAmount, params.itemNum, METIS_ADDRESS.toLocaleLowerCase(), redpacketId]);
    permit =  await signPermit(signerMetis, 1, dataHash, expire);
    
    return {permit, token: token, amount: params.totalAmount, amountDecimal:"18", status, tokenInfo:token, redpacketId};
}

export async function generateNewOneRedpacketPermit(params:{
    bizId:string,
    bizType:string,
    creator:{
        id: string,
        address: string,
    },
}) {
    await setNewUser(params.creator);
    let token = {};
    token['address'] = METIS_ADDRESS;
    token['decimals'] = "18";
    let status = "live";
    let permit = null;
    //abi.encodePacked(nftId, amount, count, currencyToken)
    const totalAmount = ethers.parseEther("0.1") + '';
    const itemNum = 3;
    const now = Date.now();
    const expire = Math.floor((now + 60 * 60 * 1000) / 1000);
    const dataHash = solidityPackedKeccak256(['uint256','uint256', 'uint256', 'address', 'address'], [params.bizId, totalAmount, itemNum, METIS_ADDRESS.toLocaleLowerCase(), params.creator.address]);
    permit =  await signPermit(signerMetis, 1, dataHash, expire);

    return {permit, token: token, amount: totalAmount, amountDecimal:"18", status, tokenInfo:token, scope:"newUser"};
}

export async function cancelNewUser(user:{
    id: string,
    address: string,
}) {
    await setCache(NEW_USER_PREFIX + user.id, "");
}

export async function setNewUser(user:{
    id: string,
    address: string,
}) {
    const rt = await isNewUser(user);
    if(rt){
        await setCache(NEW_USER_PREFIX + user.id, "1");
    }else{
        throw new HttpError(403, "not new user");
    }
}

export async function isNewUser(user: {
    id: string,
    address: string,
}) {
    const newUserInfo = await getCache(NEW_USER_PREFIX + user.id);
    if(newUserInfo){
        return false;
    }
    return true;
}

async function signPermit(signer: Signer, permitType: number, dataHash: string, expire: number): Promise<any> {
    const nonce = BigInt(hexlify(randomBytes(16)));
    const nonceStr = nonce + "";
    console.log("nonce:" + nonceStr);
    const hash = solidityPackedKeccak256(["uint8", "uint128", "uint256", "uint"], [permitType, nonce, dataHash, expire]);
    const sig = await signer.signMessage(getBytes(hash));
    return { permitType, nonce:nonceStr, dataHash, expire, sig };
  }

export async function solveAndDrawRedpacket(params:{
    user:{
        id:string,
        address:string,
    },
    redpacketId: number,
    answer: string,
}) {
    let redpacket = await redpacketRepository.findOne({where : {id: params.redpacketId}});
    if(!redpacket){
        throw new HttpError(404, "redpacket not found");
    }
    const solveRt =  await solveChallenge({
        agentId: redpacket.agentId,
        redpacketAddress: redpacket.address,
        answer: params.answer,
        user: params.user
    });
    if(solveRt.status == 'in_progress'){
        return {challengeStatus: solveRt.status};
    }
    if(solveRt.status == 'success'){
        return await drawRedpacket(params);
    }
    if(solveRt.status == 'failure'){
        return {challengeStatus: solveRt.status};
    }
    throw new HttpError(403, "challenge failed");
}

export async function drawRedpacket(params:{
    user:{
        id:string,
        address:string,
    },
    redpacketId: number,

}) {
    return await ds.transaction(
        "READ COMMITTED",
        async (manager) => {
            let redpacket = await manager.findOne(RedPacket, {where : {id: params.redpacketId}});
            if(!redpacket){
                throw new HttpError(404, "redpacket not found");
            }

            const challengeInfo = await queryChallenge({
                agentId: redpacket.agentId,
                redpacketAddress: redpacket.address,
                user:params.user,
            });

            if(!challengeInfo){
                throw new HttpError(404, "challenge not found");
            }
            if(challengeInfo.status == 'failure'){
                throw new HttpError(403, "challenge failed");
            }
            if(challengeInfo.status == 'in_progress'){
                throw new HttpError(403, "retry first");
            }
            const itemAmount = getRedpacketItemAmount(redpacket);
            const usedRecordId =  await consumeBudget({
                budgetId: redpacket.budgetId,
                consumeUser: params.user,
                bizType: "redpacket",
                bizId: params.redpacketId + '',
                amount: itemAmount['amount']
            });

            let redpacketItem = new RedPacketItem();
            redpacketItem.amount = itemAmount['amount'];
            redpacketItem.content = '{}';
            redpacketItem.drawAt = new Date();
            redpacketItem.redpacketId = params.redpacketId;
            redpacketItem.status = "offchain";
            redpacketItem.type = redpacket.type;
            redpacketItem.userId = params.user.id;
            redpacketItem.userAddres = params.user.address;
            redpacketItem.usedRecordId = usedRecordId.id;
            let savedItem = null;
            try{
                savedItem = await manager.save(RedPacketItem, redpacketItem);
               }catch(e){
                throw new HttpError(403, "has drawed!");
               }
            const setObj: any = {
                usedCount: () => `"usedCount" + 1`,
                remainAmount: () => `"remainAmount" - :dec`,
              };
              
              if (itemAmount['isLast']) {
                setObj.status = "finish";
              }
              
            await manager
            .createQueryBuilder()
            .update(RedPacket)
            .set(setObj)
            .where(`"id" = :redpacketId`, { redpacketId: params.redpacketId })
            .andWhere(`"remainAmount" >= :dec`, { dec: itemAmount['amount'] })
            .andWhere(`"usedCount" < "totalCount"`)
            .execute();
            savedItem['challengeStatus'] = "success";
            return savedItem;
        }
    );
}

export async function drawRedpacketPermit(params:{
    user:{
        id:string,
        address:string,
    },
    itemId: number,
}){
    return await ds.transaction(
        "READ COMMITTED",
        async (manager) => {
            let redpacketItem = await manager.findOne(RedPacketItem, {where : {id: params.itemId}, lock: { mode: "pessimistic_write" },});
            if(redpacketItem == null){
                throw new HttpError(404, "not fund redpacket item");
            }
            if(redpacketItem.status != 'offchain'){
                throw new HttpError(403, "has claimed!");
            }
            if(redpacketItem.userId != params.user.id){
                throw new HttpError(403, "no auth!");
            }
            const redpacket = await manager.findOne(RedPacket, {where : {id: redpacketItem.redpacketId}});
            if( redpacket == null ){
                throw new HttpError(404, "not fund redpacket");
            }
            let token = {};
            token['address'] = METIS_ADDRESS;
            token['decimals'] = "18";
            let status = "live";
            let permit = null;
            // abi.encodePacked(nftId, redpacketAddress, amount)
            const nftId = redpacket.bizId.split('_')[0];
            const dataHash = solidityPackedKeccak256(['uint256','address', 'uint256', 'address'], [nftId, redpacket.address, redpacketItem.amount, params.user.address]);
            const now = Date.now();
            const expire = Math.floor((now + 60 * 60 * 1000) / 1000);
            permit =  await signPermit(signerMetis, 2, dataHash, expire);
            redpacketItem.status = 'onchain';
            await manager.save(RedPacketItem, redpacketItem);
            return {permit, token: token, amount: redpacketItem.amount, amountDecimal:"18", status, tokenInfo:token};
        }
    );
}

export async function  permitCancel(params:{
    user:{
        id:string,
        address:string,
    },
    itemId: number,
}) {
    return await ds.transaction(
        "READ COMMITTED",
        async (manager) => {
            let redpacketItem = await manager.findOne(RedPacketItem, {where : {id: params.itemId}, lock: { mode: "pessimistic_write" },});
            if(redpacketItem == null){
                throw new HttpError(404, "not fund redpacket item");
            }
            if(redpacketItem.status != 'onchain'){
                throw new HttpError(403, "has canceld!");
            }
            if(redpacketItem.userId != params.user.id){
                throw new HttpError(403, "no auth!");
            }
            redpacketItem.status = 'offchain';
            await manager.save(RedPacketItem, redpacketItem);
        }
    );
}

export async function  syncTransactionHash(params:{
    user:{
        id:string,
        address:string,
    },
    itemId: number,
    transactionHash: string,
}){
    return await ds.transaction(
        "READ COMMITTED",
        async (manager) => {
            let redpacketItem = await manager.findOne(RedPacketItem, {where : {id: params.itemId}, lock: { mode: "pessimistic_write" },});
            if(redpacketItem == null){
                throw new HttpError(404, "not fund redpacket item");
            }
            if(redpacketItem.userId != params.user.id){
                throw new HttpError(403, "no auth!");
            }
            redpacketItem.transactionHash = params.transactionHash;
            await manager.save(RedPacketItem, redpacketItem);
        }
    );
}

function getRedpacketItemAmount(redpacket:RedPacket){
    const remainAmount = BigInt(redpacket.remainAmount);
    const remainCount = BigInt(redpacket.totalCount - redpacket.usedCount);

    let rt = {};
    rt['isLast'] = false;
    if (remainCount <= 0n) {
      throw new HttpError(403, "redpacket used out");
    }
  
    // 最后一个红包：直接吃完
    if (remainCount === 1n) {
      rt['isLast'] = true;
      rt['amount'] = remainAmount.toString();
      return rt;
      
    }
  
    // 平均红包
    if (RedpacketType.MEAN === redpacket.type) {
      rt['amount'] = (remainAmount / remainCount).toString();
      return rt;
    }
  
    // 随机红包
    if (RedpacketType.RANDOM === redpacket.type) {
      // 最小单位：1 wei（你也可以设成更大）
      const min = 1n;

      // 最大值 = 剩余平均 * 2
      let max = (remainAmount / remainCount) * 2n;
      
      // 安全兜底
      if (max < min) {
        max = min;
      }
      
      // ✅ 直接生成 [1, max] 的 bigint 随机数
      const rand = randomBigIntBetween(min, max);
  
      // 再兜一层，防止破坏最小剩余约束
      const maxAllowed =
        remainAmount - (remainCount - 1n) * min;
  
      const amount = rand > maxAllowed ? maxAllowed : rand;
      rt['amount'] = amount.toString();
      return rt;
    }
  
    throw new HttpError(403, "invalid redpacket");
}

function randomBigIntBelow(maxExclusive: bigint): bigint {
    if (maxExclusive <= 0n) throw new Error("maxExclusive must be > 0");
  
    const bits = maxExclusive.toString(2).length;
    const bytes = Math.ceil(bits / 8);
  
    while (true) {
      const buf = randomBytes(bytes);
      let x = 0n;
      for (const b of buf) x = (x << 8n) + BigInt(b);
  
      if (x < maxExclusive) return x; // 拒绝采样避免偏差
    }
  }

  function randomBigIntBetween(min: bigint, max: bigint): bigint {
    if (max < min) throw new Error("max must be >= min");
    const range = max - min + 1n;
    return min + randomBigIntBelow(range);
  }