import { randomUUID } from 'crypto';
import { z } from 'zod';
import { SurveyRepository } from '../repositories/surveyRepository.js';
import { InvalidParamsError, RequiredAnswerMissingError, SubmissionNotFoundError } from '../errors/httpError.js';
import { toSubmissionDetailDto, toSubmissionListItemDto, toSurveyQuestionDto } from '../mappers/surveyMapper.js';

const submitSchema = z.object({
  answers: z.array(
    z.object({
      question_id: z.string().min(1),
      answer_text: z.string()
    })
  ).min(1)
});

export class SurveyService {
  constructor(private readonly repo: SurveyRepository) {}

  async getSurvey(): Promise<{ survey: { questions: Array<{ question_id: string; question_type: string; question_title: string; required: boolean }> } }> {
    const questions = await this.repo.listActiveQuestions();
    return {
      survey: {
        questions: questions.map(toSurveyQuestionDto)
      }
    };
  }

  async submitSurvey(payload: unknown): Promise<{ submission_id: string; submitted_at: string }> {
    const parsed = submitSchema.safeParse(payload);
    if (!parsed.success) {
      throw new InvalidParamsError();
    }

    const questions = await this.repo.listActiveQuestions();
    const requiredQuestionIds = questions.filter((q) => q.required).map((q) => q.questionId);
    const answerMap = new Map(parsed.data.answers.map((item) => [item.question_id, item.answer_text]));

    for (const qid of requiredQuestionIds) {
      const value = answerMap.get(qid);
      if (!value || value.trim().length === 0) {
        throw new RequiredAnswerMissingError(qid);
      }
    }

    const submissionId = `sub_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const submittedAt = new Date();

    const saved = await this.repo.createSubmissionWithAnswers({
      submissionId,
      submittedAt,
      answers: parsed.data.answers.map((item) => ({
        questionId: item.question_id,
        answerText: item.answer_text
      }))
    });

    const dto = toSubmissionListItemDto(saved);
    return {
      submission_id: dto.submission_id,
      submitted_at: dto.submitted_at
    };
  }

  async listAdminSubmissions(): Promise<{ items: Array<{ submission_id: string; submitted_at: string }> }> {
    const submissions = await this.repo.listSubmissions();
    return {
      items: submissions.map(toSubmissionListItemDto)
    };
  }

  async getAdminSubmissionDetail(submissionId: string): Promise<{ submission_id: string; submitted_at: string; answers: Array<{ question_id: string; answer_text: string }> }> {
    if (!submissionId || submissionId.trim().length === 0) {
      throw new InvalidParamsError();
    }

    const { submission, answers } = await this.repo.findSubmissionDetail(submissionId);
    if (!submission) {
      throw new SubmissionNotFoundError();
    }

    return toSubmissionDetailDto(submission, answers);
  }
}
