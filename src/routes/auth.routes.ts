/**
 * LAYER RESPONSIBILITY: Wire URLs + HTTP methods to the right middleware
 * chain and controller for auth. This file is deliberately "boring" - it
 * shouldn't contain any logic, just composition.
 *
 * REQUEST FLOW for POST /api/auth/register:
 *   this route -> validate(registerSchema) -> register controller
 *   -> auth.service.ts -> User model -> MongoDB
 * (No auth.middleware.ts here - you don't have a token yet when
 * registering or logging in.)
 */

import { Router } from "express";
import { register, login } from "../controllers/auth.controller";
import { validate } from "../middleware/validate.middleware";
import { registerSchema, loginSchema } from "../schemas/auth.schema";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);

export default router;
