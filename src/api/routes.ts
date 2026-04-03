import { Router, type NextFunction, type Request, type Response } from "express";
import { FIXED_QUESTIONNAIRE } from "../config/questionnaire.js";
import { AppError } from "../infra/errors.js";
import { findSubmissionById, listSubmissionsDesc } from "../repositories/surveySubmissionRepository.js";
import { persistSubmission } from "../services/submissionService.js";

const toApiSubmission = (item: { id: string; questionnaireId: string; answers: Record<string, string>; submittedAt: Date; submitterMeta: Record<string, unknown> | null; }) => ({
  id: item.id,
  questionnaire_id: item.questionnaireId,
  answers: item.answers,
  submitted_at: item.submittedAt.toISOString(),
  submitter_meta: item.submitterMeta
});

const getRequestId = (req: Request): string => String((req as { requestId?: string }).requestId ?? "");

const ok = (res: Response, requestId: string, message: string, data: unknown, status = 200): void => {
  res.status(status).json({ code: "OK", message, requestId, data });
};

export const apiRouter = Router();

apiRouter.get("/questionnaires/fixed", (req: Request, res: Response) => {
  ok(res, getRequestId(req), "success", FIXED_QUESTIONNAIRE);
});

apiRouter.post("/submissions", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as {
      questionnaire_id?: string;
      answers?: Record<string, string>;
      submitter_meta?: Record<string, unknown>;
    };

    if (!body.questionnaire_id || !body.answers || typeof body.answers !== "object") {
      throw new AppError("INVALID_REQUEST", 400, "invalid submission payload");
    }

    const saved = await persistSubmission({
      questionnaireId: body.questionnaire_id,
      answers: body.answers,
      submitterMeta: body.submitter_meta
    });

    ok(res, getRequestId(req), "submitted", toApiSubmission(saved), 201);
  } catch (error) {
    if (error instanceof Error && error.message === "QUESTIONNAIRE_NOT_FOUND") {
      return next(new AppError("QUESTIONNAIRE_NOT_FOUND", 404, "questionnaire not found"));
    }

    if (error instanceof Error && error.message.startsWith("INVALID_REQUEST:")) {
      const field = error.message.split(":")[1];
      return next(new AppError("INVALID_REQUEST", 400, "required answer missing", { field: `answers.${field}` }));
    }

    next(error);
  }
});

apiRouter.get("/admin/submissions", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await listSubmissionsDesc();
    ok(res, getRequestId(req), "success", rows.map(toApiSubmission));
  } catch (error) {
    next(error);
  }
});

apiRouter.get("/admin/submissions/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const row = await findSubmissionById(id);
    if (!row) {
      throw new AppError("SUBMISSION_NOT_FOUND", 404, "submission not found");
    }

    ok(res, getRequestId(req), "success", toApiSubmission(row));
  } catch (error) {
    next(error);
  }
});
