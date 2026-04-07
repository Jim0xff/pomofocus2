import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DATABASE_TYPE } from '../infra/constants.js';

export type SurveyAnswerSnapshot = {
  questionId: string;
  answerText: string;
};

const answersColumnType = DATABASE_TYPE === 'postgres' ? 'jsonb' : 'simple-json';
const timestampColumnType = DATABASE_TYPE === 'postgres' ? 'timestamptz' : 'datetime';

@Entity('surveySubmissions')
@Index('idxSurveySubmissionsQuestionnaireId', ['questionnaireId'])
@Index('idxSurveySubmissionsSubmittedAtDesc', ['submittedAt', 'id'])
export class SurveySubmission {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  questionnaireId!: string;

  @Column({ type: answersColumnType })
  answers!: SurveyAnswerSnapshot[];

  @Column({ type: timestampColumnType })
  submittedAt!: Date;

  @CreateDateColumn({ type: timestampColumnType })
  createdAt!: Date;

  @UpdateDateColumn({ type: timestampColumnType })
  updatedAt!: Date;
}
