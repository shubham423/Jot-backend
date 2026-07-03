/**
 * LAYER RESPONSIBILITY: A custom Error subclass that carries an HTTP status
 * code alongside a message.
 *
 * WHY do we need this instead of just `throw new Error("not found")`?
 * Plain Error objects don't know anything about HTTP. If a service layer
 * throws a plain Error, the central error handler (error.middleware.ts)
 * has no way to know whether that should be a 404, 400, or 500 - so it
 * would have to guess, and it would guess wrong. By throwing `AppError`
 * with an explicit `statusCode`, the controller/service that detects the
 * problem also decides what status code it deserves, and the error
 * middleware just reads that off the error object. This keeps "what went
 * wrong" (business logic) and "how do we respond" (HTTP) cleanly separated
 * but still connected.
 */

export class AppError extends Error {
  public readonly statusCode: number;
  // Optional extra info (e.g. Zod validation issues) to surface to the
  // client under `error.details` in the response envelope.
  public readonly details?: unknown;

  constructor(message: string, statusCode: number, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;

    // Restores the correct prototype chain. Without this, `instanceof
    // AppError` checks can fail when targeting some JS environments,
    // because extending built-ins like Error is a known sharp edge in TS.
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
