import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity()
@Index(["outAgentId","app"])

export class CoBuildAgent {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    outAgentId: string;

    @Column()
    app: string;

    @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
    createdAt: Date;

    @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" })
    updatedAt: Date;

    @Column()
    creator: string;

    @Column({ nullable: true })
    token: string;

    @Column()
    name: string;

    @Column()
    type: string;

    @Column()
    status: string;

    @Column({ type: "text" })
    content: string;

    @Column({ nullable: true })
    quota: number;}