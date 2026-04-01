import { Column, Entity, Index, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";

@Entity()
@Unique(["bizId", "bizType"])
@Unique(["address"])
export class RedPacket {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
    createdAt: Date;


    @UpdateDateColumn({ type: "timestamp" })
    updatedAt: Date;

    @Column()
    creatorId: string;

    @Column()
    creatorAddres: string;

    @Column()
    bizId: string;

    @Column()
    bizType: string;

    @Column()
    type: string;

    @Column()
    status: string;

    @Column()
    content: string;

    @Column()
    totalCount: number;

    @Column()
    usedCount: number;

    @Column({
        type: 'numeric',
        precision: 38,
        scale: 0,
        nullable: true
      })
    totalAmount: string;


    @Column({
        type: 'numeric',
        precision: 38,
        scale: 0,
        nullable: true
      })
    remainAmount: string;

    @Column()
    address: string

    @Column({default:"common"})
    scope: string

    @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
    startedAt: Date;

    @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
    endedAt: Date;

    @Column({nullable: true})
    agentId: number;

    @Column()
    transactionHash: string;

    @Column( { nullable:true } )
    budgetId: number;
}

