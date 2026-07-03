/**
 * LAYER RESPONSIBILITY: Shared Zod pieces reused across multiple feature
 * schemas - right now, just the `:id` route param validator.
 *
 * WHY validate the id format here instead of letting Mongoose fail?
 * If we pass a malformed string (e.g. "abc") straight to
 * `Model.findById("abc")`, Mongoose throws a CastError, which - if not
 * specifically handled - would otherwise bubble up and look like a 500
 * Internal Server Error to the Android client. But a malformed id in the
 * URL is a CLIENT mistake (400), not a server failure (500). Catching it
 * here with Zod, before the request even reaches the controller, lets us
 * return the correct 400 status with a clear message instead.
 */

import { z } from "zod";
import { Types } from "mongoose";

// A Mongo ObjectId is a 24-character hex string. `Types.ObjectId.isValid`
// is the same check Mongoose itself uses internally, so we stay consistent
// with what would actually be accepted by `findById`.
export const objectIdParamSchema = z.object({
  params: z.object({
    id: z.string().refine((value) => Types.ObjectId.isValid(value), {
      message: "Invalid id format",
    }),
  }),
});
