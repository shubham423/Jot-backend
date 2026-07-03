/**
 * LAYER RESPONSIBILITY: Protect routes by requiring a valid JWT in the
 * `Authorization: Bearer <token>` header, and attach the authenticated
 * user's id to `req.userId` so every downstream controller/service can
 * trust it.
 *
 * REQUEST FLOW REMINDER:
 *   route -> validation middleware -> [this auth middleware] -> controller
 *   -> service -> model -> DB
 *
 * WHY auth AFTER validation in our route definitions?
 * It's cheaper to reject a malformed body before doing the (relatively
 * more expensive) work of verifying a cryptographic signature. Order
 * isn't a security requirement here, just a minor efficiency one -
 * both checks are mandatory and independent of each other.
 *
 * WHY does this middleware ONLY set `req.userId` and never trust a userId
 * from the request body?
 * Trusting a client-supplied id would let any authenticated user claim to
 * be ANY other user simply by changing a field in their request body.
 * The JWT's payload is cryptographically signed by our server with
 * JWT_SECRET - the client cannot forge or alter it without invalidating
 * the signature. So `req.userId`, derived from a verified token, is the
 * ONLY trustworthy source of "who is making this request" in the entire
 * app. Every service function (note.service.ts, todo.service.ts) filters
 * all queries by this value.
 */

import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";

// This is the shape of the data we put INTO the JWT when issuing it
// (see auth.service.ts). We declare it here too so `jwt.verify`'s return
// value can be typed instead of `any`.
interface AccessTokenPayload {
  userId: string;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next(new AppError("Missing or invalid Authorization header", 401));
    return;
  }

  // "Bearer <token>" - split on the space and take the token half.
  const token = authHeader.slice("Bearer ".length).trim();

  try {
    // `jwt.verify` does two things at once: (1) checks the signature
    // matches what we'd produce with JWT_SECRET (proving WE issued it and
    // it hasn't been tampered with), and (2) checks the `exp` (expiry)
    // claim hasn't passed. If either check fails, it throws.
    const decoded = jwt.verify(token, env.jwtSecret) as AccessTokenPayload;
    req.userId = decoded.userId;
    next();
  } catch {
    // We deliberately don't distinguish "expired" vs "malformed" vs
    // "wrong secret" in the response - all of them mean the same thing to
    // the client: "your token isn't valid, log in again." Leaking which
    // specific reason it failed gives an attacker more information than
    // they need.
    next(new AppError("Invalid or expired token", 401));
  }
}
