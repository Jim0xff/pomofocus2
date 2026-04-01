import { schedule } from "node-cron";
import { withLock } from "./cache.js";
import { rr } from "./logger.js";
import { logger } from "./logger.js";

export function scanLoop(func: () => Promise<void>, interval: number = 1000) {
    rl('scanLoop', func).then(() => setTimeout(scanLoop, interval, func, interval));
}

export function scheduleWithLock(cron: string, func: () => Promise<void>) {
    schedule(cron, () => rl('schedule', func))
}

export function rl(name: string, func: () => Promise<void>) {
    return rr(func.name, () =>
        withLock({ key: `${name}:${func.name}`, expireInSeconds: 60 }, func).catch(error => logger.error(`${name}: ${error}`))
    )
}