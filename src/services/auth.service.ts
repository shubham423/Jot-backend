/**
 * LAYER RESPONSIBILITY: All business logic for registering/logging in
 * users - password hashing, JWT issuing, talking to the User model. The
 * controller layer calls these functions; it never touches Mongoose or
 * bcrypt/jwt directly.
 *
 * WHY split "service" out from "controller" at all?
 * The controller's job is HTTP concerns: read `req`, call a service, send
 * a response with `res`. The service's job is business logic: rules,
 * calculations, DB access - things that have nothing to do with HTTP and
 * could just as easily be reused by a CLI script or a test, without ever
 * touching `req`/`res`. Keeping them separate means we can unit-test
 * "does registering with a duplicate email throw the right error?"
 * without spinning up Express at all.
 */

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { UserModel, UserDocument } from "../models/user.model";
import { AppError } from "../utils/AppError";
import { env } from "../config/env";

// The number of bcrypt "salt rounds" - each increment roughly doubles the
// time it takes to hash a password. 10 is a well-established default that
// balances security (slow enough to resist brute-forcing) against not
// making every login/register request noticeably slow.
const BCRYPT_SALT_ROUNDS = 10;

// What we send back to the client for a "user" - notice `passwordHash`
// is not part of this shape at all. We don't just delete it from the
// Mongoose document; we build a brand-new object that never had it,
// which is a much safer pattern than remembering to strip a field.
interface PublicUser {
  id: string;
  email: string;
  createdAt: Date;
}

interface AuthResult {
  token: string;
  user: PublicUser;
}

function toPublicUser(user: UserDocument): PublicUser {
  return {
    id: user._id.toString(),
    email: user.email,
    createdAt: user.createdAt,
  };
}

// Signs a JWT containing just enough info to identify the user on future
// requests. We keep the payload minimal (just userId) - anything else
// we'd want "fresh" (like email, in case it changes) should be looked up
// from the DB again, not trusted from an old token.
function issueToken(userId: string): string {
  return jwt.sign({ userId }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  } as jwt.SignOptions);
}

export async function registerUser(email: string, password: string): Promise<AuthResult> {
  // Checking for an existing user first (rather than relying solely on
  // Mongo's unique index + catching the duplicate-key error) lets us
  // return a clean, predictable 409 in the common case. The unique index
  // still exists as a safety net for the rare race condition where two
  // registrations for the same email land at almost the same instant.
  const existing = await UserModel.findOne({ email });
  if (existing) {
    throw new AppError("An account with that email already exists", 409);
  }

  // We NEVER store the plain-text password - only its bcrypt hash. bcrypt
  // automatically generates and embeds a random salt per password, so
  // even two users with the identical password get different hashes.
  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  const user = await UserModel.create({ email, passwordHash });

  return {
    token: issueToken(user._id.toString()),
    user: toPublicUser(user),
  };
}

export async function loginUser(email: string, password: string): Promise<AuthResult> {
  const user = await UserModel.findOne({ email });

  // IMPORTANT: we deliberately give the SAME error message and status
  // code whether the email doesn't exist OR the password is wrong.
  // Saying "email not found" vs "wrong password" would let an attacker
  // use our login endpoint to discover which emails have accounts at all
  // (an "account enumeration" leak).
  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  // bcrypt.compare re-hashes the candidate password with the same salt
  // that's embedded in the stored hash, and checks if the result matches
  // - this is the only correct way to check a bcrypt password (you can
  // never "decrypt" a hash back to the original password).
  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new AppError("Invalid email or password", 401);
  }

  return {
    token: issueToken(user._id.toString()),
    user: toPublicUser(user),
  };
}
