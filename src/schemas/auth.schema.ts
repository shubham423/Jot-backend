/**
 * LAYER RESPONSIBILITY: Zod schemas describing exactly what a valid
 * register/login HTTP request body looks like. These run in
 * validate.middleware.ts, BEFORE any controller or service code executes.
 *
 * WHY validate here instead of in the service?
 * This is "validation at the boundary": the moment untrusted data from
 * the internet enters our system (the HTTP request), we want to reject
 * anything malformed immediately, with a clear 400 error, before it has
 * a chance to flow deeper into business logic or the database. This
 * keeps controllers/services simple - by the time they run, they can
 * assume `req.body` already matches the expected shape.
 *
 * See user.model.ts for why this does NOT make Mongoose's own validation
 * redundant - they protect different boundaries.
 */

import { z } from "zod";

// `z.object({...})` describes the expected shape of `req.body`.
// `.email()` and `.min()` are built-in Zod string validators - if these
// fail, Zod produces a structured, readable error (see
// validate.middleware.ts for how we turn that into our 400 response).
export const registerSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email("Must be a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long"),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email("Must be a valid email address"),
    password: z.string().min(1, "Password is required"),
  }),
});

// `z.infer` derives a TypeScript type directly from the Zod schema, so we
// never have to manually keep a separate `interface RegisterBody {...}`
// in sync with the validation rules - one source of truth.
export type RegisterInput = z.infer<typeof registerSchema>["body"];
export type LoginInput = z.infer<typeof loginSchema>["body"];
