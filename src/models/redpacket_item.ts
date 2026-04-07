import { Column, Entity, Index, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";

@Entity()
@Index(["redpacketId"])
@Unique(["redpacketId", "userId"])
export class RedPacketItem {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
    createdAt: Date;


    @UpdateDateColumn({ type: "timestamp" })
    updatedAt: Date;

    @Column()
    redpacketId: number;

    @Column()
    userId: string;

    @Column()
    userAddres: string;

    @Column()
    type: string;

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

    @Column({nullable:true})
    transactionHash: string;

    @Column({ type: "timestamp", nullable:true })
    drawAt: Date;

    @Column()
    usedRecordId: number
}

