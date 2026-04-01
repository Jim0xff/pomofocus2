import { Column, Entity, Index, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";

@Entity()
@Index(["parentBudgetId"])
@Index(["budgetId"])
@Index(["bizId", "bizType"])
@Unique(["budgetId","userId", "bizType","bizId"])
export class BudgetUsedRecord {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
    createdAt: Date;

    @UpdateDateColumn({ type: "timestamp" })
    updatedAt: Date;

    @Column()
    bizId: string;

    @Column()
    bizType: string;


    @Column()
    userId: string;

    @Column()
    budgetId: number;

    @Column({ nullable: true })
    parentBudgetId: number;

    @Column()
    status: string;

    @Column()
    content: string;

    @Column({
        type: 'numeric',
        precision: 38,
        scale: 0,
        nullable: true
      })
    amount: string;

}

