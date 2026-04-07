export enum AdventureType {
    NONE = 'none',
    FOREST = 'forest',
    CITY = 'city',
    BEACH = 'beach',
    SPACE = 'space'
}

export enum ChatRole {
    MASTER = 'master',
    AGENT = 'agent',
}

export enum coBuildAgentStatus {
    RUN = 'run',
    STOP = 'stop',
}

export enum ChatType {
    WELCOME = 'welcome',
    NORMAL = 'normal',
    ADVENTURE_CHOOSE = 'adventure_choose',
    ADVENTURE_PROMPT = 'adventure_prompt',
    ADVENTURE_REWARD = 'adventure_reward',
    UPDATE_DAT = 'update_dat',
    ACTION = 'action',
    GREETING = 'greeting',
}

export type GraphQLChat = {
    id: number;
    agentId: string;
    agentName: string;
    userName: string;
    userId: string;
    role: string;
    type: ChatType;
    content: string;
    timestamp: number;
}

export type BasicLazbubuInfo = {
    tokenId: number,
    name: string,
    masterName: string,
    rarity: number,
    image: string,
    onChainOwnerAddress: string,
    recordedOwnerAddress: string,
    creatorAddress: string,
    birthday: number,
    mature: boolean,
    needSetNames: boolean,
    dblevel: number,
    level: number,
    personality: string,
}

export type LazbubuInfo = BasicLazbubuInfo & {
    adventureCount: number,
    memoryUnitQuota: number,
    memoryUnitUsed: number,
}

export type SubgraphAdventure = {
    id: string;
    user: string;
    timestamp: number;
    adventureType: number;
    tokenId: number;
    contentHash: string;
}

export type AdventureInfo = {
    user: string;
    timestamp: number;
    tokenId: number;
    type: AdventureType;
    text: string;
    image?: string;
    txHash: string;
    score?: number;
}

export enum BudgetType {
    ENTIRETY = 'entirety',
    SLICE = 'slice',
}

export enum BudgetStatus {
    VALID = 'valid',
    INVALID = 'invalid',
    USED = 'used',
}

export enum RedpacketType {
    RANDOM = 'random',
    MEAN = 'mean'
}