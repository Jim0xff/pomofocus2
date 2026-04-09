import { DataSource } from 'typeorm';
import { SurveyQuestion } from '../models/surveyQuestion.js';
import { SurveySubmission } from '../models/surveySubmission.js';
import { SurveySubmissionAnswer } from '../models/surveySubmissionAnswer.js';

export class SurveyRepository {
  constructor(private readonly ds: DataSource) {}

  listActiveQuestions(): Promise<SurveyQuestion[]> {
    return this.ds.getRepository(SurveyQuestion).find({
      where: { status: 'active' },
      order: { sortOrder: 'ASC' }
    });
  }

  async createSubmissionWithAnswers(input: {
    submissionId: string;
    submittedAt: Date;
    answers: Array<{ questionId: string; answerText: string }>;
  }): Promise<SurveySubmission> {
    return this.ds.transaction(async (manager) => {
      const submissionRepo = manager.getRepository(SurveySubmission);
      const answersRepo = manager.getRepository(SurveySubmissionAnswer);

      const submission = submissionRepo.create({
        submissionId: input.submissionId,
        submittedAt: input.submittedAt,
        status: 'submitted'
      });
      await submissionRepo.save(submission);

      const answerRows = input.answers.map((item) =>
        answersRepo.create({
          submissionId: input.submissionId,
          questionId: item.questionId,
          answerText: item.answerText
        })
      );
      await answersRepo.save(answerRows);

      return submission;
    });
  }

  listSubmissions(): Promise<SurveySubmission[]> {
    return this.ds.getRepository(SurveySubmission).find({
      order: { submittedAt: 'DESC' }
    });
  }

  async findSubmissionDetail(submissionId: string): Promise<{ submission: SurveySubmission | null; answers: SurveySubmissionAnswer[] }> {
    const submissionRepo = this.ds.getRepository(SurveySubmission);
    const answersRepo = this.ds.getRepository(SurveySubmissionAnswer);

    const submission = await submissionRepo.findOne({ where: { submissionId } });
    if (!submission) {
      return { submission: null, answers: [] };
    }

    const answers = await answersRepo.find({
      where: { submissionId },
      order: { id: 'ASC' }
    });

    return { submission, answers };
  }
}
