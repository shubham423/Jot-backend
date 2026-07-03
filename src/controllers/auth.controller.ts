/**
 * LAYER RESPONSIBILITY: Translate HTTP requests into service calls and
 * service results into HTTP responses, for auth routes. By the time code
 * reaches here, `req.body` has ALREADY been validated and transformed by
 * Zod (validate.middleware.ts) - this controller can just trust its shape.
 *
 * REQUEST FLOW REMINDER: route -> validate middleware -> [this controller]
 * -> auth.service.ts -> User model -> MongoDB -> back up through here.
 * (Register/login don't go through auth.middleware.ts, since you can't
 * require a token to obtain your first token!)
 */

import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/apiResponse";
import { registerUser, loginUser } from "../services/auth.service";
import { RegisterInput, LoginInput } from "../schemas/auth.schema";

export const register = asyncHandler(async (req: Request, res: Response) => {
  // Casting req.body to our Zod-inferred type is safe here BECAUSE the
  // validate middleware already ran registerSchema against this exact
  // route and would have thrown a 400 before we ever got here.
  const { email, password } = req.body as RegisterInput;

  const result = await registerUser(email, password);

  // 201 Created: we created a new resource (the user account).
  sendSuccess(res, 201, result);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as LoginInput;

  const result = await loginUser(email, password);

  // 200 OK: login doesn't create anything new, it just returns a token.
  sendSuccess(res, 200, result);
});
