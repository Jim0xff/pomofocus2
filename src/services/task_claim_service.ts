
import { TaskClaim } from "../models/task_claim.js";
import { getRepository } from "../infra/datasource.js";
import { logger } from "../infra/logger.js";
import { taskPointPost } from "./task_point_client.js";

const taskClaimRecordRepository = getRepository(TaskClaim);


export async function claimTask(bizId: string, bizType: string, userId: number, contentObj: any) {
    let taskClaimRecord = new TaskClaim();
    taskClaimRecord.bizId = bizId;
    taskClaimRecord.bizType = bizType;
    taskClaimRecord.userId = userId;
    taskClaimRecord.status = "init";
    let TaskClaimRecordContent = contentObj;
    taskClaimRecord.content = JSON.stringify(TaskClaimRecordContent);
    await taskClaimRecordRepository.save(taskClaimRecord);
    await doClaim(taskClaimRecord, false);
}

export async function recorverClaimTask() {
    let taskClaimRecords = await taskClaimRecordRepository.find({
        where: [
            { status: "init" },
            { status: "failed" }
        ],
        take: 300
    });
    console.log("recover task claim,total count:%s", taskClaimRecords.length);

    if (taskClaimRecords.length != 0) {
        for (let record of taskClaimRecords) {
            try {
                await doClaim(record as TaskClaim, true);
            } catch (error) {
                console.error("recover task claim failed!");
            }

        }
    }
}


export async function doClaim(taskClaimRecord: TaskClaim, isRetry: boolean) {
    const taskClaimRecordContent = JSON.parse(taskClaimRecord.content);
    const body = {
        "templateCode": taskClaimRecordContent.taskTemplate,
        "app": "lazbubu",
        "innerUserId": taskClaimRecord.userId,
        "operator": {
            "id": taskClaimRecord.userId,
        },
        "bizId": taskClaimRecord.bizId,
        "bizType": taskClaimRecord.bizType,
        "extraParams": taskClaimRecordContent.extraParams
    };
    if (isRetry) {
        taskClaimRecord.retryTimes += 1;
    }

    let claimStatus = "";
    try {
        await taskPointPost('/task/claimServer', body, null, false);
        claimStatus = "success";
    } catch (error) {
        logger.error("claim call failed: %s", error);
        claimStatus = "failed";
    }
    taskClaimRecord.status = claimStatus;
    await taskClaimRecordRepository.save(taskClaimRecord);
}