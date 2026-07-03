/**
 * LAYER RESPONSIBILITY: Zod schemas for note-related request bodies and
 * query strings. See auth.schema.ts for why we validate at this boundary
 * and how it differs from Mongoose's own validation.
 */

import { z } from "zod";

export const createNoteSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1, "Title is required"),
    // `content` is optional on input - the Mongoose model defaults it to
    // "" if omitted, so we don't need to default it again here. Keeping
    // the default in ONE place (the model) avoids the two layers
    // disagreeing about what "no content" means.
    content: z.string().optional(),
  }),
});

export const updateNoteSchema = z.object({
  body: z.object({
    // Both fields optional because PUT here is used as "update the
    // fields you send" rather than "you must resend the entire resource".
    // `.refine` below ensures the body isn't completely empty.
    title: z.string().trim().min(1, "Title cannot be empty").optional(),
    content: z.string().optional(),
  }).refine((data) => data.title !== undefined || data.content !== undefined, {
    message: "Provide at least one field to update (title or content)",
  }),
});

// Query params arrive as strings even when they "look like" numbers
// (e.g. `?page=2` gives us the string "2", not the number 2) - that's how
// URLs work. We use `z.coerce.number()` to convert them, and clamp sane
// defaults/bounds so a client can't accidentally request `?limit=999999`
// and hammer the database.
export const listNotesQuerySchema = z.object({
  query: z.object({
    search: z.string().trim().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});
