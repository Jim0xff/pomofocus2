import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';

@Entity({ name: 'questionnaireQuestion' })
@Unique('uqQuestionnaireQuestion', ['questionnaireRefId', 'questionId'])
export class QuestionnaireQuestion {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  questionnaireRefId!: number;

  @Column({ type: 'varchar', length: 64 })
  questionId!: string;

  @Column({ type: 'text' })
  questionText!: string;

  @Column({ type: 'varchar', length: 32 })
  questionType!: string;

  @Column({ type: 'boolean', default: false })
  required!: boolean;

  @Column({ type: 'int' })
  displayOrder!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
