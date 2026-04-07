import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity()
@Index(["userId"])
@Index(["status"])
@Index(["bizId", "bizType"])
export class TaskClaim {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
    createdAt: Date;

    @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" })
    updatedAt: Date;

    @Column()
    userId: number;

    @Column()
    status: string;

    @Column({ default: 0 })
    retryTimes: number;

    @Column({ type: "text" })
    content: string;

    @Column({ nullable: true })
    bizId: string;

    @Column({ nullable: true })
    bizType: string;
}