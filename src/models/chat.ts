import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { AdventureType, ChatRole, ChatType } from "../infra/types.js";

@Entity()
@Index(["userId"])
@Index(["agentId", "userId"])
export class Chat {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
    createdAt: Date;

    @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" })
    updatedAt: Date;

    @Column('enum', { enum: Object.values(ChatRole), default: ChatRole.MASTER })
    role: ChatRole;

    @Column({ nullable: true })
    userAddress: string;

    @Column()
    userId: string;

    @Column()
    userName: string;

    @Column()
    agentId: string;

    @Column()
    agentName: string;

    @Column()
    content: string;

    @Column('enum', { default: ChatType.NORMAL, enum: Object.values(ChatType) })
    type: ChatType;

}

