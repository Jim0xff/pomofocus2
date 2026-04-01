import { AdventureType, ChatRole, ChatType } from "./infra/types.js";

export const typeDefs = `#graphql
  enum AdventureType {
    ${Object.values(AdventureType).join('\n')}
  }

  enum ChatType {
    ${Object.values(ChatType).join('\n')}
  }

  enum ChatRole {
    ${Object.values(ChatRole).join('\n')}
  }
  type Contracts {
    dataRegistryAddress: String!
    verifiedComputingAddress: String!
    dataAnchoringTokenAddress: String!
    settlementAddress: String!
    inferenceAddress: String!
    trainingAddress: String!
  }

  type Config {
    contracts: Contracts!
    rsaPublicKey: String!
    avatarBaseUrl: String!
  }


  type User {
    userAddress: String!
  }

  type ShareImage {
    imageUrl: String
    shareId: String!
  }

  type Permit {
    """permit JSON string"""
    permit: String

    """permit data"""
    data: String

    """error message"""
    err: String
  }


 type RedpacketPageResponse {
    list:[RedpacketDetail]
    total: Int
 }

 type RedpacketDetail{
    id: Int
    createdAt: String
    updatedAt: String
    creatorId: String
    creatorAddres: String
    bizId: String
    bizType: String
    type: String
    status: String
    content: String
    totalCount: Int
    usedCount: Int
    totalAmount: String
    remainAmount: String
    address: String
    scope: String
    startedAt: String
    endedAt: String
    agentId: Int
    transactionHash: String
    budgetId: Int
    items:[RedpacketItemDetail]
    challenge:ChallengeDetail

    """是否可以领奖 true没有领过,可以领奖（特殊情况：chanllenge的状态如果为failure代表已经没机会答题了，也不能领了） false领过了，不能领奖了"""
    canDraw: Boolean
    agentInfo:AgentInfo
 }

 type ChallengeDetail{

    """答题状态 success答题成功 failure答题失败且无法再试 in_progress可以答题"""
    status: String!

 }

 type RedpacketItemDetail{
   id: Int
   createdAt: String
   updatedAt: String
   redpacketId: Int
   userId: String
   userAddres: String
   type: String

   """领取状态 offchain未领取 onchain已领取"""
   status: String

   transactionHash: String
   content: String
   amount: String
   drawAt: String
   usedRecordId: Int
 }

 type TokenDetail {
    name: String
    symbol: String
    address: String
    decimals: String
 }
 
 type PermitDetail {
     permitType: Int!
     nonce: String!
     dataHash: String!
     expire: String!
     sig: String!
 }

 type GenerateRedpacketPayload {
     id: String
 }
 type DrawRedpacketPayload {
     id: String
     challengeStatus: String!
 }

 type DrawRedpacketPermit {
      permit: PermitDetail
      amount: String
      amountDecimal: String
      status: String
      tokenInfo: TokenDetail
 }

input CreatorInput {
  id: ID!
  address: String!
}
enum RedpacketType {
  mean
  random
}

input GenerateRedpacketInput {
  bizId: String!
  bizType: String!
  itemNum: Int!
  totalAmount: String!
  type: RedpacketType!
  creator: CreatorInput
  transactionHash: String!
  address: String!

  """可见范围 common private newUser"""
  scope: String!
}



input GenerateRedpacketPermitInput {
  bizId: String!
  bizType: String!
  itemNum: Int
  totalAmount: String
  creator: CreatorInput
}

input GenerateRedpacketAndAgentInput {
  bizType: String!
  itemNum: Int!
  totalAmount: String!
  creator: CreatorInput
  agentName: String!
  desc: String!
  imageId: String!
}

type GenerateRedpacketPermit {
      permit: PermitDetail
      amount: String
      amountDecimal: String
      status: String
      tokenInfo: TokenDetail
      signature: String
      deadline: String
      bizId: String
      redpacketId: Int
      scope: String
 }

 type ConfigDetail{
    redpacketFactoryContractAddress:String
    nftAddress:String
    newUserNftId:String
    redpacketManager:String
 }

type newUserRedpacketDetail{
    address:String
 }

type JackpotDetail{
    createTimestamp:String
    jackpotAmount:String
    nftId:String
    redpacketAddress:String
    transactionHash:String
    jackpotId:String
    redpacketOwner:String
}
type AgentInfo{
    id:String
    name:String
    imageUrl:String
}

type UserParticipatedJackpot{
    jackpotId:String

    """ON_GOING NOT_WON WON"""
    status:String

    createTimestamp:String
    agentInfo:AgentInfo
    nowCnt:String
    targetCnt:String
}

type UserRedpacketItem{
    redpacketId:String
    createdAt:String
    amount:String
    id:String
    userAddres:String
}

type JackpotInfo{
     jackpotCnt:String
     jackpotAmount:String
     jackpotId:String
     targetCnt:String
}

 input queryRedpacketListInput {
  status: String
  scope: String
  creator: CreatorInput
  pageNum: Int!
  pageSize: Int!
  loginUser:CreatorInput
}

  type Query {
    getRedpacketList(input: queryRedpacketListInput): RedpacketPageResponse
    getUserParticipatedRedpacket:[RedpacketDetail]
    redpacketDetail(redpacketAddress: String!):RedpacketDetail
    config:ConfigDetail
    newUserRedpacketInfo:newUserRedpacketDetail
    jackpotList:[JackpotDetail]
    getUserParticipatedJackpot:[UserParticipatedJackpot]
    getCurrentJackpotInfo: JackpotInfo
    getUserJackpotAmountTotal: String
    getCurrencyPrice: String
    jackpotBanner:[UserRedpacketItem]
    userWinJackpotList:[JackpotDetail]
  }

  type Mutation {
    generateRedpacket(input: GenerateRedpacketInput!): GenerateRedpacketPayload!
    solveAndDrawRedpacket(redpacketId: String, answer: String): DrawRedpacketPayload!
    drawRedpacket(redpacketId: String): DrawRedpacketPayload!
    drawRedpacketPermit(itemId: String): DrawRedpacketPermit!
    permitCancel(itemId: String): String
    generateNewOneRedpacketPermit(input: GenerateRedpacketPermitInput!): GenerateRedpacketPermit!
    generateRedpacketPermit(input: GenerateRedpacketPermitInput!): GenerateRedpacketPermit!
    generateRedpacketPermitAndAgent(input: GenerateRedpacketAndAgentInput!): GenerateRedpacketPermit!
    newUserCancel: String
    syncDrawTransactionHash(itemId: String, transactionHash: String): String
  }
`;