import { REDPACKET_SUBGRAPH_URL } from "../infra/constants.js";
import { currentRequestId, logger } from "../infra/logger.js";


export async function queryJackpotList(limit:number) {
    const res = await fetch(REDPACKET_SUBGRAPH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
          query MyQuery {\n  jackpots(first: 100, orderBy: createTimestamp, orderDirection: desc) {\n    blockNumber\n    createTimestamp\n  jackpotId\n   id\n    jackpotAmount\n    jackpotId\n    nftId\n    redpacketAddress\n    redpacketOwner\n    transactionHash\n  }\n}
        `,
        variables: {
          limit:limit
        }
      }),
    });
  
    const json = await res.json()
    logger.info("queryJackpotList result:" + JSON.stringify(json));

    if (json.errors?.length) {
      throw new Error(`queryJackpotList error: ${JSON.stringify(json.errors)}`);
    }
  
    if (!json.data || !json.data.jackpots) {
      return [];
    }
  
    return json.data.jackpots;
  }

  export async function queryJackpotListByJackpotIds(jackpotIds:[number]) {
    const res = await fetch(REDPACKET_SUBGRAPH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
         query MyQuery($jackpotIds: [Int!]) {
        jackpots(where: { jackpotId_in: $jackpotIds }) {
          id
          jackpotId
          jackpotAmount
          nftId
          redpacketAddress
          redpacketOwner
          transactionHash
          blockNumber
          createTimestamp
        }
      }
        `,
        variables: {
          jackpotIds:jackpotIds
        }
      }),
    });
  
    const json = await res.json()
    logger.info("queryJackpotList result:" + JSON.stringify(json));

    if (json.errors?.length) {
      throw new Error(`queryJackpotList error: ${JSON.stringify(json.errors)}`);
    }
  
    if (!json.data || !json.data.jackpots) {
      return [];
    }
  
    return json.data.jackpots;
  }


  export async function queryUserJackpotRedpackets(userAddres:string) {
    const res = await fetch(REDPACKET_SUBGRAPH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
          query MyQuery($userAddress: String) {\n  redpacketInJackpots(where: {redpacketOwner: $userAddress}, orderBy: createTimestamp, orderDirection: desc) {\n    blockNumber\n    createTimestamp\n    id\n    jackpotId\n    nftId\n    redpacketAddress\n    redpacketOwner\n    transactionHash\n  }\n}
        `,
        variables: {
          userAddress:userAddres
        }
      }),
    });
  
    const json = await res.json()
    logger.info("queryUserJackpotRedpackets result:" + JSON.stringify(json));

    if (json.errors?.length) {
      throw new Error(`queryUserJackpotRedpackets error: ${JSON.stringify(json.errors)}`);
    }
  
    if (!json.data || !json.data.redpacketInJackpots) {
      return [];
    }
  
    return json.data.redpacketInJackpots;
  }


  export async function queryJackpotListByUserAddress(userAddress:string) {
    const res = await fetch(REDPACKET_SUBGRAPH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
         query MyQuery($redpacketOwner: String) {
        jackpots(where: { redpacketOwner: $redpacketOwner },orderBy: createTimestamp,orderDirection: desc) {
          id
          jackpotId
          jackpotAmount
          nftId
          redpacketAddress
          redpacketOwner
          transactionHash
          blockNumber
          createTimestamp
        }
      }
        `,
        variables: {
          redpacketOwner:userAddress
        }
      }),
    });
  
    const json = await res.json()
    logger.info("queryJackpotList result:" + JSON.stringify(json));

    if (json.errors?.length) {
      throw new Error(`queryJackpotList error: ${JSON.stringify(json.errors)}`);
    }
  
    if (!json.data || !json.data.jackpots) {
      return [];
    }
  
    return json.data.jackpots;
  }