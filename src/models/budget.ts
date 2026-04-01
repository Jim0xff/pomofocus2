import { Column, Entity, Index, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";

@Entity()
@Index(["parentId"])
@Unique(["bizId", "bizType"])
export class Budget {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
    createdAt: Date;

    @UpdateDateColumn({ type: "timestamp" })
    updatedAt: Date;

    @Column()
    creatorId: string;

    @Column()
    bizId: string;

    @Column()
    bizType: string;

    @Column()
    type: string;

    @Column()
    status: string;

    @Column({nullable:true})
    parentId: number;

    @Column({default:0})
    childCount: number;

    @Column()
    content: string;

    @Column({
        type: 'numeric',
        precision: 38,
        scale: 0,
        nullable: true
      })
    remainAmount: string;

    @Column({
        type: 'numeric',
        precision: 38,
        scale: 0,
        nullable: true
      })
    totalAmount: string;

}

