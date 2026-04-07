import { HttpError } from "../infra/HttpError.js";
import { getRepository , getDataSource} from "../infra/datasource.js";
import { BudgetStatus, BudgetType } from "../infra/types.js";
import { Budget } from "../models/budget.js";
import { BudgetUsedRecord } from "../models/budget_used_record.js";




const budgetRepository = getRepository(Budget);
const budgetUsedRecordRepository = getRepository(BudgetUsedRecord);
const ds = getDataSource();

export async function createBudget(params:{
    bizId:string,
    bizType:string,
    creator:{
        id:string,
        address:string,
    },
    type:BudgetType,
    totalAmount:string
}) {
   return await ds.transaction(
     "READ COMMITTED",
     async (manager) => {
        const exsitsBudget = await manager.findOne(Budget, {where:{bizId:params.bizId, bizType:params.bizType}});
        if(exsitsBudget != null){
            return exsitsBudget.id;
        }
        const budget = new Budget();
        budget.bizId = params.bizId;
        budget.bizType = params.bizType;
        budget.creatorId = params.creator.id;
        budget.type = params.type;
        budget.status = BudgetStatus.VALID;
    
        budget.content = JSON.stringify({ creator: params.creator });
        budget.totalAmount = params.totalAmount;
        budget.remainAmount = params.totalAmount;
    
        const saved = await manager.save(Budget, budget);
        return saved.id;
     }
   );
}

export async function consumeBudget(params:{
    budgetId:number,
    consumeUser:{
        id
    },
    bizType: string,
    bizId: string,
    amount: string,
}) {
    return await ds.transaction(
        "READ COMMITTED",
        async (manager) => {
           let exsitsBudget = await manager.findOne(Budget, {where:{id:params.budgetId}});
           if(!exsitsBudget){
            throw new HttpError(404, "budget not exsits");
           }
           let budgetUsedRecord = new BudgetUsedRecord();
           budgetUsedRecord.amount = params.amount;
           budgetUsedRecord.bizId = params.bizId;
           budgetUsedRecord.bizType = params.bizType;
           budgetUsedRecord.budgetId = params.budgetId;
           budgetUsedRecord.parentBudgetId = exsitsBudget.parentId??params.budgetId;
           budgetUsedRecord.content = '{}';
           budgetUsedRecord.status = 'USED';
           budgetUsedRecord.userId = params.consumeUser.id;
           let saved = null;
           try{
            saved = await manager.save(BudgetUsedRecord, budgetUsedRecord);
           }catch(e){
             if (e?.code === "23505") {
                const exists = await budgetUsedRecordRepository.findOne({
                  where: {
                    budgetId: params.budgetId,
                    userId: params.consumeUser.id,
                  },
                });
                return {id:exists.id, code: e.code};
              }
              throw e;
           }

           const updateRt = await manager
           .createQueryBuilder()
           .update(Budget)
           .set({ remainAmount: () => "remainAmount - :dec" })
           .where("id = :budgetId", { budgetId:params.budgetId })
           .andWhere("remainAmount >= :dec", { dec: params.amount })
           .execute();
           if (updateRt.affected === 0) {
             console.error("Budget is exhausted , params:" + JSON.stringify(params));
             throw new HttpError(403, "Budget is exhausted!");
           }

           return {id:saved.id, code:200};
        }
      ); 
}
