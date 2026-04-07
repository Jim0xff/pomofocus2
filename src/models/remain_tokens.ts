import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity()

export class RemainToken {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
    createdAt: Date;

    @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" })
    updatedAt: Date;

    @Column()
    status: string;

    @Column({ type: "text" })
    content: string;

    @Column({nullable : true})
    startAt: Date

    @Column({nullable : true})
    endAt: Date

    @Column()
    targetToken: string;

    @Column({
        type: 'numeric',
        precision: 38,
        scale: 0,
        nullable: true
      })
    remainAmount: string;

    @Column()
    chainId: string;
}