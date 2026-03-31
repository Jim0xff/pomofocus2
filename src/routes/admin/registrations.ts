import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { getRegistrationList } from "../../services/registrationService";

export const adminRegistrationRouter = Router();

adminRegistrationRouter.get("/admin/registrations", authMiddleware, async (req, res, next) => {
  try {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);
    const data = await getRegistrationList(page, pageSize);

    res.status(200).json({
      code: "OK",
      message: "success",
      data,
      requestId: res.locals.requestId
    });
  } catch (error) {
    next(error);
  }
});
