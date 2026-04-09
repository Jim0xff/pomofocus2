import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('surveySubmissions')
@Index('uqSurveySubmissionsSubmissionId', ['submissionId'], { unique: true })
@Index('idxSurveySubmissionsSubmittedAt', ['submittedAt'])
export class SurveySubmission {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id!: number;

  @Column({ type: 'varchar', length: 64 })
  submissionId!: string;

  @Column({ type: 'varchar', length: 32, default: 'submitted' })
  status!: string;

  @Column({ type: 'datetime' })
  submittedAt!: Date;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;
}
