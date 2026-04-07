import { DataSource } from 'typeorm';
import { DATABASE_URL, DATABASE_CA } from './constants.js';
import { CoBuildAgent } from '../models/co_build_agent.js';
import { TaskClaim } from '../models/task_claim.js';
import { RemainToken } from '../models/remain_tokens.js';
import { BudgetUsedRecord } from '../models/budget_used_record.js';
import { Budget } from '../models/budget.js';
import { RedPacketItem } from '../models/redpacket_item.js';
import { RedPacket } from '../models/redpacket.js';

// to avoid self signed certificate issue
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

let ds: DataSource = null;

export function getRepository(name: any) {
    return getDataSource().getRepository(name);
}

export function getDataSource() {
    if (ds) {
        return ds;
    }

    ds = new DataSource({
        type: 'postgres',
        url: DATABASE_URL,
        ssl: {
            rejectUnauthorized: false,
            ca: DATABASE_CA,
        },
        synchronize: true,
        logging: process.env.LOG_SQL === 'true',
        entities: [BudgetUsedRecord, Budget, RedPacketItem, RedPacket],

    });

    return ds;
}

export function initializeDatabase() {
    const dataSource = getDataSource();
    return dataSource.initialize();
}