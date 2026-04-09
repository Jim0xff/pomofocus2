import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('surveyQuestions')
@Index('uqSurveyQuestionsQuestionId', ['questionId'], { unique: true })
@Index('idxSurveyQuestionsSortOrder', ['sortOrder'])
@Index('idxSurveyQuestionsStatusSortOrder', ['status', 'sortOrder'])
export class SurveyQuestion {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id!: number;

  @Column({ type: 'varchar', length: 64 })
  questionId!: string;

  @Column({ type: 'varchar', length: 32 })
  questionType!: string;

  @Column({ type: 'varchar', length: 512 })
  questionTitle!: string;

  @Column({ type: 'boolean', default: false })
  required!: boolean;

  @Column({ type: 'integer' })
  sortOrder!: number;

  @Column({ type: 'varchar', length: 32, default: 'active' })
  status!: string;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;
}
