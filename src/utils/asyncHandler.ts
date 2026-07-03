/**
 * LAYER RESPONSIBILITY: A wrapper for async Express route handlers so we
 * never need to write `try { ... } catch (err) { next(err) }` in every
 * single controller.
 *
 * WHY is this necessary at all?
 * Express was built for *synchronous* error handling - if a regular
 * (non-async) handler throws, Express's internal machinery catches it
 * automatically and forwards it to your error-handling middleware.
 *
 * But our controllers are `async` functions (because they `await` calls
 * to the database via services). If an `async` function throws or its
 * returned Promise rejects, Express does NOT automatically catch that -
 * the rejection just gets silently lost (in older Express) or crashes the
 * process, neither of which calls our nice central error handler.
 *
 * The fix is always the same shape: call `.catch(next)` on the promise so
 * any rejection gets routed into Express's `next(err)` mechanism, which
 * then flows into error.middleware.ts. Repeating that by hand in every
 * controller is repetitive and easy to forget, so we wrap it once here.
 */

import { NextFunction, Request, Response } from "express";

// A controller function has this shape: it takes the standard Express
// (req, res, next) and returns a Promise (because it's `async`).
type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

export function asyncHandler(fn: AsyncRequestHandler) {
  // We return a NEW function with the exact same (req, res, next) shape
  // that Express expects. Express calls this wrapper; the wrapper calls
  // your real controller and attaches `.catch(next)` to its promise.
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
