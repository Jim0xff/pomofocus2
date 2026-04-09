import { SurveyQuestion } from '../models/surveyQuestion.js';
import { SurveySubmission } from '../models/surveySubmission.js';
import { SurveySubmissionAnswer } from '../models/surveySubmissionAnswer.js';

export function toSurveyQuestionDto(question: SurveyQuestion): {
  question_id: string;
  question_type: string;
  question_title: string;
  required: boolean;
} {
  return {
    question_id: question.questionId,
    question_type: question.questionType,
    question_title: question.questionTitle,
    required: question.required
  };
}

export function toSubmissionListItemDto(submission: SurveySubmission): {
  submission_id: string;
  submitted_at: string;
} {
  return {
    submission_id: submission.submissionId,
    submitted_at: submission.submittedAt.toISOString()
  };
}

export function toSubmissionDetailDto(submission: SurveySubmission, answers: SurveySubmissionAnswer[]): {
  submission_id: string;
  submitted_at: string;
  answers: Array<{ question_id: string; answer_text: string }>;
} {
  return {
    submission_id: submission.submissionId,
    submitted_at: submission.submittedAt.toISOString(),
    answers: answers.map((answer) => ({
      question_id: answer.questionId,
      answer_text: answer.answerText
    }))
  };
}
