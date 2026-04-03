import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

@Entity("surveySubmissions")
export class SurveySubmission {
  @PrimaryColumn({ type: "varchar", length: 64 }) id!: string;
  @Column({ type: "varchar", length: 64 }) questionnaireId!: string;
  @Column({ type: "jsonb" }) answers!: Record<string, string>;
  @Column({ type: "timestamptz" }) submittedAt!: Date;
  @Column({ type: "jsonb", nullable: true }) submitterMeta!: Record<string, unknown> | null;
  @CreateDateColumn({ type: "timestamptz" }) createdAt!: Date;
  @UpdateDateColumn({ type: "timestamptz" }) updatedAt!: Date;
}
