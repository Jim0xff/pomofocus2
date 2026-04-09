import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { SurveyQuestion } from './surveyQuestion.js';
import { SurveySubmission } from './surveySubmission.js';

@Entity('surveySubmissionAnswers')
@Index('idxSurveySubmissionAnswersSubmissionId', ['submissionId'])
@Index('idxSurveySubmissionAnswersQuestionId', ['questionId'])
@Index('uqSurveySubmissionAnswersSubmissionQuestion', ['submissionId', 'questionId'], { unique: true })
export class SurveySubmissionAnswer {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id!: number;

  @Column({ type: 'varchar', length: 64 })
  submissionId!: string;

  @Column({ type: 'varchar', length: 64 })
  questionId!: string;

  @Column({ type: 'text' })
  answerText!: string;

  @ManyToOne(() => SurveySubmission, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'submissionId', referencedColumnName: 'submissionId', foreignKeyConstraintName: 'fkSurveySubmissionAnswersSubmissionId' })
  submission!: SurveySubmission;

  @ManyToOne(() => SurveyQuestion, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'questionId', referencedColumnName: 'questionId', foreignKeyConstraintName: 'fkSurveySubmissionAnswersQuestionId' })
  question!: SurveyQuestion;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;
}
