/**
 * LAYER RESPONSIBILITY: Wire note URLs to their middleware chain and
 * controllers.
 *
 * REQUEST FLOW for e.g. GET /api/notes/:id:
 *   this route -> validate(objectIdParamSchema) -> requireAuth
 *   -> getNote controller -> note.service.ts -> Note model -> MongoDB
 *
 * `requireAuth` is applied to the whole router with `router.use(...)`
 * below, so EVERY note route requires a valid JWT - there's no route in
 * this file that's accidentally left unprotected.
 */

import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { objectIdParamSchema } from "../schemas/common.schema";
import {
  createNoteSchema,
  updateNoteSchema,
  listNotesQuerySchema,
} from "../schemas/note.schema";
import {
  createNote,
  listNotes,
  getNote,
  updateNote,
  deleteNote,
} from "../controllers/note.controller";

const router = Router();

// Applies to every route defined below in this file.
router.use(requireAuth);

router.post("/", validate(createNoteSchema), createNote);
router.get("/", validate(listNotesQuerySchema), listNotes);
router.get("/:id", validate(objectIdParamSchema), getNote);
router.put("/:id", validate(objectIdParamSchema), validate(updateNoteSchema), updateNote);
router.delete("/:id", validate(objectIdParamSchema), deleteNote);

export default router;
