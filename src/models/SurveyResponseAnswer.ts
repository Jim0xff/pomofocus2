import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Unique, Index } from 'typeorm';

@Entity({ name: 'surveyResponseAnswer' })
@Unique('uqSurveyResponseAnswer', ['responseId', 'questionId'])
@Index('idxSurveyResponseAnswerResponseId', ['responseId'])
export class SurveyResponseAnswer {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 64 })
  responseId!: string;

  @Column({ type: 'varchar', length: 64 })
  questionId!: string;

  @Column({ type: 'text' })
  answer!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
