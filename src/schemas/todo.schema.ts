/**
 * LAYER RESPONSIBILITY: Zod schemas for todo-related request bodies and
 * query strings. See auth.schema.ts for why we validate at this boundary
 * and how it differs from Mongoose's own validation.
 */

import { z } from "zod";

// A shared helper: dueDate arrives over JSON as an ISO 8601 string (that's
// what Moshi/Retrofit will send), so we accept a string and convert it to
// a real Date here, at the edge - controllers and services then work with
// actual Date objects instead of re-parsing strings everywhere.
const dueDateSchema = z
  .string()
  .datetime({ message: "dueDate must be an ISO 8601 date string" })
  .transform((value) => new Date(value));

export const createTodoSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1, "Title is required"),
    dueDate: dueDateSchema.optional(),
  }),
});

export const updateTodoSchema = z.object({
  body: z
    .object({
      title: z.string().trim().min(1, "Title cannot be empty").optional(),
      completed: z.boolean().optional(),
      dueDate: dueDateSchema.optional(),
    })
    .refine(
      (data) =>
        data.title !== undefined ||
        data.completed !== undefined ||
        data.dueDate !== undefined,
      { message: "Provide at least one field to update" }
    ),
});

export const listTodosQuerySchema = z.object({
  query: z.object({
    // Query strings are always raw strings, so "true"/"false" arrive as
    // text, not booleans - we explicitly map them here rather than using
    // z.coerce.boolean(), because z.coerce.boolean() treats ANY non-empty
    // string (including the literal text "false") as true, which would
    // silently produce the wrong filter.
    completed: z
      .enum(["true", "false"])
      .optional()
      .transform((value) => (value === undefined ? undefined : value === "true")),
    sort: z.enum(["createdAt", "dueDate"]).optional().default("createdAt"),
  }),
});
