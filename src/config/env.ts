/**
 * LAYER RESPONSIBILITY: Load environment variables from `.env` and validate
 * that everything the app needs is actually present and well-formed.
 *
 * WHY validate env vars instead of just `process.env.PORT`?
 * `process.env.X` is always typed as `string | undefined` in TypeScript.
 * If we sprinkled `process.env.JWT_SECRET` directly through the codebase,
 * every usage site would have to handle "what if this is undefined?" -
 * and forgetting to do that is a classic way backend apps crash in
 * production at 2am. Instead, we validate ONCE, here, at startup, and the
 * rest of the app imports a fully-typed `env` object that TypeScript knows
 * is always defined. Fail fast, fail loud, fail in one place.
 */

import dotenv from "dotenv";
import { z } from "zod";

// Reads the .env file in the project root and loads its keys into
// process.env. If .env doesn't exist (e.g. in some deployment setups),
// this just does nothing - real env vars set by the OS/host still work.
dotenv.config();

// This is the "shape" we require process.env to match. Using Zod here
// (instead of manual if-checks) gives us good error messages for free
// and keeps validation declarative.
const envSchema = z.object({
  PORT: z.string().default("4000"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  JWT_EXPIRES_IN: z.string().default("7d"),
});

// safeParse (instead of parse) lets us print a friendly error and exit
// cleanly, rather than throwing an unhandled exception with a confusing
// stack trace before the server has even started.
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid or missing environment variables:");
  console.error(parsedEnv.error.flatten().fieldErrors);
  process.exit(1);
}

// Everything below this line, in every other file, can trust that `env`
// is fully populated and correctly typed - no more `string | undefined`.
export const env = {
  port: Number(parsedEnv.data.PORT),
  mongodbUri: parsedEnv.data.MONGODB_URI,
  jwtSecret: parsedEnv.data.JWT_SECRET,
  jwtExpiresIn: parsedEnv.data.JWT_EXPIRES_IN,
};
