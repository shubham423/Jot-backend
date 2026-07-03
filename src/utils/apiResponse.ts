/**
 * LAYER RESPONSIBILITY: Tiny helpers that build the consistent JSON
 * envelope every API response uses, so the Android client (via
 * Retrofit/Moshi) can always parse responses the same way regardless of
 * which endpoint it hit.
 *
 * Success shape: { "success": true, "data": <payload> }
 * Error shape:   { "success": false, "error": { "message": "...", "details": <optional> } }
 *
 * WHY bother with helpers instead of writing `res.json({...})` everywhere?
 * If the envelope shape ever needs a tweak (e.g. adding a `meta` field for
 * pagination), we only change it here instead of hunting through every
 * controller. It also makes every controller's intent obvious at a glance:
 * `sendSuccess(res, 201, note)` reads clearly as "respond 201 Created with
 * this note".
 */

import { Response } from "express";

export function sendSuccess<T>(res: Response, statusCode: number, data: T): void {
  res.status(statusCode).json({
    success: true,
    data,
  });
}

// Used directly by error.middleware.ts (the only place errors are turned
// into responses). Controllers/services never call this themselves - they
// just `throw new AppError(...)` and let the central handler do this.
export function sendError(
  res: Response,
  statusCode: number,
  message: string,
  details?: unknown
): void {
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(details !== undefined ? { details } : {}),
    },
  });
}
