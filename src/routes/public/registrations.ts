import { Router } from "express";
import { createRegistration } from "../../services/registrationService";

export const publicRegistrationRouter = Router();

publicRegistrationRouter.post("/registrations", async (req, res, next) => {
  try {
    const created = await createRegistration(req.body, process.env.REGISTRATION_DEADLINE_UTC ?? "");
    res.status(201).json({
      code: "CREATED",
      message: "registration submitted",
      data: created,
      requestId: res.locals.requestId
    });
  } catch (error) {
    next(error);
  }
});
