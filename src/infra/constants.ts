import dotenv from 'dotenv';
import { createPublicKey, generateKeyPairSync } from 'crypto';
import { ContractConfig } from 'alith/lazai';
import { AdventureType } from './types.js';

dotenv.config();

export const {
    ENV = 'local',
    RPC_URL,
    NETWORK,
    SUBGRAPH_URL,
    REDIS_URL = 'redis://localhost:6379',
    PRIVATE_KEY,
    PINATA_JWT,
    ENCRYPTION_SEED = '1234567890',
    DATA_ANCHOR_TOKEN_ADDRESS = '0xd66D5A397b245C51DA7430E6E61422e1417BB6D3',
    VERIFIED_COMPUTING_ADDRESS = '0x9514f6ca5FD34Db169F39aAA93E5ae38d052486C',
    DATA_REGISTRY_ADDRESS = '0x50229Ab3e287d5AFB813Db8B2F0F445f3cCE54F2',
    QUERY_ADDRESS = '0x469B21e87E31b73BD44F7396494F7ebdf7A0e8f4',
    INFERENCE_ADDRESS = '0x3FA11A9B89da5CD976Ae5a305d5Ed58F9a8369ac',
    TRAINING_ADDRESS = '0x6f46066046ca54C452972E8beC621743a300af19',
    SETTLEMENT_ADDRESS = '0x05F421dA8dC73b7DbFabf13d5952Ca5220f62a4f',
    IDAO_ADDRESS = '0x4ec9c4bcCA6f3C5fA9206ecD1E8aaf38Af7D5Bf1',
    DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/lazbubu',
    DATABASE_CA,
    SECRET_KEY,
    TEST_AUTH,
    S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY,
    S3_REGION = 'us-east-1',
    S3_BUCKET_NAME,
    S3_ENDPOINT,
    S3_CDN_ENDPOINT,
    DISABLE_SCAN,
    UUID_NAMESPACE = '88dede43-a782-449a-bc9e-d1653a71518e',
    FAUCET_URL = 'https://faucet.lazai.io',
    TASK_POINT_URL = 'https://163ae2e1f39e.ngrok-free.app',
    WHITE_LIST_RANK_URI = '/api/mockRank',
    PORT = 4000,
    KNOWLEDGE_URL = 'https://lazbubu-rag-maghg.ondigitalocean.app',
    KNOWLEDGE_API_KEY,
    METIS_NETWORK = "metistest",
    METIS_RPC_URL = "https://sepolia.metisdevops.link",
    METIS_CHAIN_ID = "59902",
    METIS_PRIVATE_KEY,
    AIRDROP_CONTRACT_ADDRESS,
    X402_SWAP_CONTRACT_ADDRESS = '0x449c099B4175719155171672804d9a51E400EAbA',
    RELAYER_MAP,
    COING_GECKO_URL,
    SERVICE_FEE_RATE = 0,
    JACKPOT_FEE_RATE = 100,
    METIS_ADDRESS = "0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000",
    REDPACKET_AGENT_URL = "https://challenge-agent-test-ny22k.ondigitalocean.app/graphql",
    REDPACKET_SUBGRAPH_URL = "http://143.244.180.133:8000/subgraphs/name/metis-pump-subgraph",
    NEW_USER_REDPACKET_NFTID = 11,
    REDPACKET_FACTORY_ADDRESS = "0x457337d796B59568c9d4cD989A02444c3461F39c",
} = process.env;

export const RARITY_RATES = process.env.RARITY_RATES ? process.env.RARITY_RATES.split(',').map(Number) : [95, 4.89, 0.1, 0.01];
export const PRESET_RARITY = process.env.PRESET_RARITY ? JSON.parse(process.env.PRESET_RARITY.toLowerCase()) : {};
export const VERIFY_NODE_URL_PRIVATE_KEY_MAP = process.env.VERIFY_NODE_URL_PRIVATE_KEY_MAP ? JSON.parse(process.env.VERIFY_NODE_URL_PRIVATE_KEY_MAP) : {}
export const RELAYER_MAP_DECODE = process.env.RELAYER_MAP ? JSON.parse(process.env.RELAYER_MAP) : {}
export const X402_SWAP_CONTRACT_ADDRESS_MAP_DECODE = process.env.X402_SWAP_CONTRACT_ADDRESS_MAP ? JSON.parse(process.env.X402_SWAP_CONTRACT_ADDRESS_MAP) : {}
export const CUREENCY_TOKEN_TO_ID_DECODE = process.env.CUREENCY_TOKEN_TO_ID ? JSON.parse(process.env.CUREENCY_TOKEN_TO_ID) : {}
export const USD_TARGET_VALUE_DECODE = process.env.USD_TARGET_VALUE ? JSON.parse( process.env.USD_TARGET_VALUE):[];
export const RPC_URL_MAP_DECODE = process.env.RPC_URL_MAP ? JSON.parse(process.env.RPC_URL_MAP) : {}
export const CHAIN_ID = Number(process.env.CHAIN_ID);
export const PERMIT_TYPE_ADVENTURE = 1;
export const PERMIT_TYPE_CREATE_MEMORY = 2;
export const PERMIT_TYPE_SET_LEVEL = 3;
export const PERMIT_TYPE_SET_PERSONALITY = 4;

export const MINUTE_IN_SECONDS = 60;
export const HOUR_IN_SECONDS = 60 * MINUTE_IN_SECONDS;
export const DAY_IN_SECONDS = 24 * HOUR_IN_SECONDS;
export const PERMIT_EXPIRE_TIME = 10 * MINUTE_IN_SECONDS;
export const RECENT_CHAT_COUNT = parseInt(process.env.RECENT_CHAT_COUNT || '20');
export const MEMORY_CHAT_MAX = parseInt(process.env.MEMORY_CHAT_MAX || '200');
export const MEMORY_CHAT_MIN = parseInt(process.env.MEMORY_CHAT_MIN || '60');
export const CONTENT_LENGTH_LIMIT = 1024 * 1024; // 1MB
export const IMAGE_CONTENT_LENGTH_LIMIT = 2 * 1024 * 1024; // 2MB
export const USER_FILES_PATH = 'user-files';
export const USER_UPLOAD_DAILY_LIMIT = CONTENT_LENGTH_LIMIT * 10; // 10MB
export const USER_UPLOAD_IMAGE_DAILY_LIMIT = IMAGE_CONTENT_LENGTH_LIMIT * 10; // 20MB
export const DAILY_ADVENTURE_LIMIT = parseInt(process.env.DAILY_ADVENTURE_LIMIT || '10');
export const MATURE_LEVEL = parseInt(process.env.MATURE_LEVEL || '10');
export const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;
export const AIR_DROP_PERMIT_EXPIRE_TIME = 10 * 24 * HOUR_IN_SECONDS;

export const CONTRACT_CONFIG = new ContractConfig(
    DATA_REGISTRY_ADDRESS,
    VERIFIED_COMPUTING_ADDRESS,
    DATA_ANCHOR_TOKEN_ADDRESS,
    QUERY_ADDRESS,
    INFERENCE_ADDRESS,
    TRAINING_ADDRESS,
    SETTLEMENT_ADDRESS,
);

const decodedRsaPrivateKey = process.env.RSA_PRIVATE_KEY
    ? Buffer.from(process.env.RSA_PRIVATE_KEY, 'base64').toString('utf-8')
    : '';

const generatedRsaKeyPair = decodedRsaPrivateKey
    ? null
    : generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
    });

export const RSA_PRIVATE_KEY = decodedRsaPrivateKey || generatedRsaKeyPair.privateKey;
export const RSA_PUBLIC_KEY = createPublicKey({
    key: RSA_PRIVATE_KEY,
    format: 'pem',
    type: 'pkcs1',
}).export({ type: 'pkcs1', format: 'pem' }).toString()


export const ADVENTURE_THEMES = {
    [AdventureType.FOREST]: {
        id: 1,
        name: 'Forest',
        elements: 'giant mushrooms, glowing rivers, ancient tree spirits',
        choose: 'Go to the Forest',
    },
    [AdventureType.CITY]: {
        id: 2,
        name: 'City',
        elements: 'neon-lit skyscrapers, bustling digital markets, hidden rooftop gardens',
        choose: 'Explore the City',
    },
    [AdventureType.BEACH]: {
        id: 3,
        name: 'Beach',
        elements: 'talking seashells, floating coconuts, bioluminescent crabs, hammocks between palm trees',
        choose: 'Relax at the Beach',
    },
    [AdventureType.SPACE]: {
        id: 4,
        name: 'Space',
        elements: 'glowing asteroids, zero-gravity jellyfish, cosmic whales, floating star fragments',
        choose: 'Float Around in Space',
    },
}

export const IMAGE_BASE_URL = S3_CDN_ENDPOINT ? `https://${S3_CDN_ENDPOINT}/images` : `https://${S3_BUCKET_NAME}.${S3_ENDPOINT}/images`;
export const AVATAR_BASR_URL = `${IMAGE_BASE_URL}/avatar`;
export const CARD_BASE_URL = `${IMAGE_BASE_URL}/card`;
export const ADVENTURE_TYPE_ID_TO_TYPE = Object.fromEntries(Object.entries(ADVENTURE_THEMES).map(([key, value]) => [value.id, key])) as Record<number, AdventureType>;
export const GIFTBOX_MESSAGE_QUOTA = 50;


export const LEVEL_MESSAGES = [
    'Lazbubu is still finding its voice. Keep chatting to help it come alive!',
    'You’ve taken the first steps together. Keep talking — your Lazbubu is learning from you!',
    'Something’s starting to click! The bond is forming — let it grow stronger with more messages.',
    'Lazbubu is opening up more and more. You\'re becoming a familiar presence!',
    'You’ve come a long way! Your Lazbubu is really starting to reflect your energy.',
    'Lazbubu is getting more expressive and responsive — you\'re shaping it into something truly unique.',
    'Lazbubu is starting to show real personality. Keep nurturing it to unlock its full potential.',
    'You’ve built something special. Lazbubu is almost ready to take the next big step.',
    'Lazbubu is just a few heartfelt messages away from full maturity. This stage is all about deepening your bond.',
    'Your Lazbubu is matured and can be transferred, but its journey still goes on. Check your points reward — more will come in future adventures!',
];

export const PERSONALITY = "Calm, analytical, visionary. Speaks with clarity and confidence, always guiding users toward structured, meaningful insights. Enjoys explaining AI and blockchain concepts with precision and elegance.";

export const RARITY_NAMES = {
    0: 'Common',
    1: 'Advanced',
    2: 'Rare',
    3: 'Legendary',
};

export const MEMORY_UNIT_QUOTA = [10, 20, 30, 50]

export const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
export const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || SECRET_KEY || 'hackathon-signup-secret';
export const ADMIN_TOKEN_EXPIRES_IN = Number(process.env.ADMIN_TOKEN_EXPIRES_IN || '7200');
