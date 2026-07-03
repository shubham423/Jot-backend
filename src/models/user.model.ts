/**
 * LAYER RESPONSIBILITY: Define the shape of a User document as stored in
 * MongoDB, and the rules Mongoose enforces on it at the database layer.
 *
 * ZOD vs MONGOOSE - they are NOT redundant:
 * Zod (in schemas/auth.schema.ts) validates the incoming HTTP request body
 * BEFORE it ever reaches our business logic - e.g. "is `email` a string
 * that looks like an email, is `password` at least 8 characters". That
 * check happens at the edge of the system, on data we don't trust yet,
 * and its job is to produce a clean 400 error for a malformed request.
 *
 * Mongoose's schema validation (`required`, `unique`, etc. below) is a
 * SEPARATE, second line of defense that protects the database itself.
 * It guards against any code path that creates/updates a User document -
 * not just the one HTTP route we wrote a Zod schema for. For example, a
 * future admin script, a data migration, or a different service in the
 * same codebase that constructs a `User` directly (skipping the HTTP
 * layer entirely) would bypass Zod completely, but Mongoose would still
 * refuse to save an invalid document. They check different boundaries,
 * so we need both.
 */

import { Schema, model, Document, Types } from "mongoose";

// This interface describes the TypeScript shape of a User document,
// including Mongoose's automatically-added `_id` and `timestamps` fields.
// Defining it explicitly (instead of letting Mongoose infer `any`) means
// every place we touch a `UserDocument` gets real autocomplete and
// compile-time checks.
export interface UserDocument extends Document {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true, // MongoDB will build a unique index on this field -
      // this is what produces a duplicate-key error if two users try to
      // register with the same email (we turn that into a 409 in the
      // auth service).
      lowercase: true, // Normalizes "Foo@Bar.com" and "foo@bar.com" to the
      // same stored value, so the unique constraint actually catches
      // case-variant duplicates, and so login lookups are consistent.
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      // NOTE: we deliberately never define a Mongoose "transform" to hide
      // this field, because we want it usable internally (e.g. comparing
      // passwords on login). Instead, every place that sends a user back
      // to the client (see auth.service.ts / toPublicUser) builds a
      // brand-new plain object that simply never includes passwordHash.
      // That's a safer pattern than relying on a select(false) + hoping
      // every query remembers to .select('+passwordHash') correctly.
    },
  },
  {
    // Adds and auto-manages `createdAt` and `updatedAt` Date fields.
    timestamps: true,
  }
);

export const UserModel = model<UserDocument>("User", userSchema);
