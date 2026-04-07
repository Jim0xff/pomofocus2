import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Unique, Index } from 'typeorm';

@Entity({ name: 'surveyResponse' })
@Unique('uqSurveyResponseResponseId', ['responseId'])
@Index('idxSurveyResponseSubmittedAt', ['submittedAt'])
export class SurveyResponse {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 64 })
  responseId!: string;

  @Column({ type: 'varchar', length: 64 })
  questionnaireId!: string;

  @Column({ type: 'datetime' })
  submittedAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
