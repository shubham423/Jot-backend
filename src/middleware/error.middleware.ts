/**
 * LAYER RESPONSIBILITY: The single place in the whole app that turns a
 * thrown error into an HTTP response. Every other layer (controllers,
 * services, middleware) just `throw`s when something goes wrong - this
 * is the only file that calls `res.json(...)` for an error case.
 *
 * REQUEST FLOW REMINDER: when ANY middleware calls `next(err)`, or an
 * `asyncHandler`-wrapped controller's promise rejects, Express skips all
 * normal middleware/routes and jumps straight to this handler (it's
 * recognized as an "error handler" because it has 4 parameters - that's
 * an Express convention, not optional).
 *
 * WHY centralize this instead of formatting errors in each controller?
 * Two reasons:
 *  1. Consistency - the Android client only has to learn ONE error JSON
 *     shape ({ success: false, error: { message, details? } }), no
 *     matter which endpoint failed or why.
 *  2. Safety - it's the one place we decide what's safe to leak to the
 *     client. Unexpected/unknown errors (a real bug, a DB outage) get a
 *     generic "Something went wrong" 500 message here, so we never
 *     accidentally expose internal stack traces or DB error text to a
 *     mobile client.
 */

import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { AppError } from "../utils/AppError";
import { sendError } from "../utils/apiResponse";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Case 1: an error WE threw on purpose, with a known status code.
  // This covers validation failures (400 from validate.middleware.ts),
  // auth failures (401), not-found (404), duplicate email (409), etc.
  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.message, err.details);
    return;
  }

  // Case 2: Mongoose's own validation rejected a document (e.g. a
  // `required` field was missing some way OTHER than our Zod schema
  // catching it first - a useful backstop, see user.model.ts comments).
  if (err instanceof mongoose.Error.ValidationError) {
    sendError(res, 400, "Database validation failed", err.errors);
    return;
  }

  // Case 3: a malformed ObjectId slipped past our Zod param check (e.g.
  // it was technically valid, but referenced a field type we cast wrong),
  // or some other path produced a Mongoose CastError. Still the client's
  // fault (a bad id-shaped value), so 400, not 500.
  if (err instanceof mongoose.Error.CastError) {
    sendError(res, 400, "Invalid id format");
    return;
  }

  // Case 4: MongoDB duplicate-key error (e.g. registering with an email
  // that's already taken slips past our service-level pre-check due to a
  // race condition). Mongo error code 11000 is the standard "duplicate
  // key" code - this is the same one our auth.service.ts can also detect
  // before this point, but having a backstop here costs nothing.
  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: number }).code === 11000
  ) {
    sendError(res, 409, "A record with that value already exists");
    return;
  }

  // Case 5: truly unexpected. Log the full error server-side for
  // debugging, but tell the client only the minimum safe message.
  console.error("Unexpected error:", err);
  sendError(res, 500, "Something went wrong. Please try again later.");
}
