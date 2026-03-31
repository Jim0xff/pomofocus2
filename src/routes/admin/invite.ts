import { Router } from "express";
import { verifyInviteAndIssueToken } from "../../services/inviteAccessService";
import { HttpError } from "../../utils/httpError";

export const adminInviteRouter = Router();

adminInviteRouter.post("/admin/invite/verify", async (req, res, next) => {
  try {
    const inviteCode = String(req.body?.inviteCode ?? "").trim();
    if (!inviteCode) {
      throw new HttpError(400, "VALIDATION_ERROR", "inviteCode is required");
    }

    const data = await verifyInviteAndIssueToken(
      inviteCode,
      process.env.ADMIN_INVITE_CODE ?? "",
      Number(process.env.ADMIN_TOKEN_TTL_SECONDS ?? 7200)
    );

    res.status(200).json({
      code: "OK",
      message: "invite verified",
      data,
      requestId: res.locals.requestId
    });
  } catch (error) {
    next(error);
  }
});
