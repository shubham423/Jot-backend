/**
 * LAYER RESPONSIBILITY: A generic, reusable Express middleware factory
 * that validates `req.body`, `req.params`, and/or `req.query` against any
 * Zod schema we hand it, BEFORE the request reaches the controller.
 *
 * REQUEST FLOW REMINDER:
 *   route -> [this validation middleware] -> auth middleware -> controller
 *   -> service -> model -> DB -> (response flows back the same path)
 *
 * WHY ONE generic middleware instead of writing validation inline in each
 * controller?
 * Every route needs the exact same three steps: run Zod's `.parse`/
 * `.safeParse`, and either (a) replace the request's data with the
 * parsed/transformed version, or (b) reject with a 400. Writing that by
 * hand in 12 different controllers would be repetitive AND risky -
 * it's exactly the kind of place where someone eventually forgets a step.
 * Instead, every route just declares WHICH schema applies
 * (e.g. `validate(createNoteSchema)`), and this file is the only place
 * that knows HOW validation works.
 */

import { NextFunction, Request, Response } from "express";
import { ZodError, ZodSchema } from "zod";
import { AppError } from "../utils/AppError";

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      // We validate body/params/query together as one object, matching
      // how each schema file shapes itself (e.g. `z.object({ body: ..., params: ... })`).
      // `parse` (not `safeParse`) throws a ZodError on failure, which we
      // catch below - this lets us funnel every failure through one
      // code path instead of branching on a `.success` flag every time.
      const parsed = schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
      });

      // IMPORTANT: we write the PARSED result back onto the request, not
      // just check it and move on. This matters because Zod can
      // TRANSFORM data (e.g. `z.coerce.number()` turns the string "2"
      // into the number 2, and our todo schema turns an ISO date string
      // into a real `Date`). If we didn't overwrite `req.body`/`req.query`
      // here, controllers downstream would still see the original,
      // untransformed strings.
      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.query !== undefined) {
        // req.query's type in Express is fixed (ParsedQs); we intentionally
        // widen it here since our route handlers only ever read the
        // already-validated/transformed fields off of it.
        req.query = parsed.query as unknown as Request["query"];
      }
      if (parsed.params !== undefined) {
        req.params = parsed.params as unknown as Request["params"];
      }

      next();
    } catch (err) {
      if (err instanceof ZodError) {
        // `flatten()` turns Zod's nested error tree into a simple
        // { fieldErrors, formErrors } object - much easier for an
        // Android client (or a human debugging with curl) to read than
        // Zod's raw internal error format.
        next(new AppError("Validation failed", 400, err.flatten()));
        return;
      }
      // Anything else is unexpected - let the central error handler
      // treat it as a generic 500.
      next(err);
    }
  };
}
