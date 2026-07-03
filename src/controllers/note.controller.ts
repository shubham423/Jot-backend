/**
 * LAYER RESPONSIBILITY: Translate HTTP requests into note.service.ts
 * calls and send responses. `req.userId` is guaranteed to be set here
 * because every note route runs through `requireAuth` first (see
 * routes/note.routes.ts) - see types/express.d.ts for how that's typed.
 *
 * REQUEST FLOW: route -> validate middleware -> requireAuth middleware
 * -> [this controller] -> note.service.ts -> Note model -> MongoDB.
 */

import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/apiResponse";
import * as noteService from "../services/note.service";

export const createNote = asyncHandler(async (req: Request, res: Response) => {
  // `req.userId!` - the `!` is safe because `requireAuth` ran before this
  // controller for every route that uses it, and would have already sent
  // a 401 and stopped the chain if it weren't set.
  const { title, content } = req.body;
  const note = await noteService.createNote(req.userId!, title, content);
  sendSuccess(res, 201, note);
});

export const listNotes = asyncHandler(async (req: Request, res: Response) => {
  const { search, page, limit } = req.query as unknown as {
    search?: string;
    page: number;
    limit: number;
  };
  const result = await noteService.listNotes({ userId: req.userId!, search, page, limit });
  sendSuccess(res, 200, result);
});

export const getNote = asyncHandler(async (req: Request, res: Response) => {
  const note = await noteService.getNoteById(req.userId!, req.params.id);
  sendSuccess(res, 200, note);
});

export const updateNote = asyncHandler(async (req: Request, res: Response) => {
  const note = await noteService.updateNote(req.userId!, req.params.id, req.body);
  sendSuccess(res, 200, note);
});

export const deleteNote = asyncHandler(async (req: Request, res: Response) => {
  await noteService.deleteNote(req.userId!, req.params.id);
  // 200 with a small confirmation payload - simpler for the Android
  // client to parse uniformly than special-casing a 204 No Content body.
  sendSuccess(res, 200, { deleted: true });
});
