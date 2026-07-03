/**
 * LAYER RESPONSIBILITY: Business logic + DB access for notes. Every
 * function here takes the authenticated `userId` explicitly and uses it
 * to scope every query - this is what guarantees a user can never read,
 * edit, or delete another user's notes, no matter what the controller or
 * client sends.
 */

import { NoteModel, NoteDocument } from "../models/note.model";
import { AppError } from "../utils/AppError";

// Shape we return to the Android client: camelCase, `id` instead of
// `_id`, and Dates that JSON.stringify will automatically render as ISO
// 8601 strings (e.g. "2026-06-23T10:00:00.000Z") - exactly what Moshi
// expects for date parsing.
interface NoteResponse {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

function toNoteResponse(note: NoteDocument): NoteResponse {
  return {
    id: note._id.toString(),
    title: note.title,
    content: note.content,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

export async function createNote(
  userId: string,
  title: string,
  content?: string
): Promise<NoteResponse> {
  const note = await NoteModel.create({ userId, title, content });
  return toNoteResponse(note);
}

interface ListNotesParams {
  userId: string;
  search?: string;
  page: number;
  limit: number;
}

interface ListNotesResult {
  notes: NoteResponse[];
  page: number;
  limit: number;
  total: number;
}

export async function listNotes(params: ListNotesParams): Promise<ListNotesResult> {
  const { userId, search, page, limit } = params;

  // ALWAYS filter by userId first - this is the user-scoping guarantee.
  // Everything else (search) is layered on top of that base filter, never
  // instead of it.
  const filter: Record<string, unknown> = { userId };

  if (search) {
    // Case-insensitive "contains" match on title. We escape regex special
    // characters in the user's input so a search like "a.b" or "(test)"
    // can't be (ab)used to build an unintended/expensive regex pattern.
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.title = { $regex: escaped, $options: "i" };
  }

  const skip = (page - 1) * limit;

  // Run the count and the page fetch concurrently - they're independent
  // reads, so there's no reason to wait for one before starting the other.
  const [notes, total] = await Promise.all([
    NoteModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    NoteModel.countDocuments(filter),
  ]);

  return {
    notes: notes.map(toNoteResponse),
    page,
    limit,
    total,
  };
}

export async function getNoteById(userId: string, noteId: string): Promise<NoteResponse> {
  // Scoping by BOTH _id and userId in a single query (rather than
  // findById then checking ownership in JS) means a note that exists but
  // belongs to someone else produces the exact same "not found" result
  // as a note that doesn't exist at all - we never leak whether a given
  // id exists for another user.
  const note = await NoteModel.findOne({ _id: noteId, userId });
  if (!note) {
    throw new AppError("Note not found", 404);
  }
  return toNoteResponse(note);
}

export async function updateNote(
  userId: string,
  noteId: string,
  updates: { title?: string; content?: string }
): Promise<NoteResponse> {
  const note = await NoteModel.findOneAndUpdate(
    { _id: noteId, userId },
    { $set: updates },
    { new: true, runValidators: true } // `new: true` returns the
    // UPDATED document; `runValidators: true` makes Mongoose re-run its
    // own schema validation (e.g. `required`) on the update, not just on
    // initial creation.
  );

  if (!note) {
    throw new AppError("Note not found", 404);
  }
  return toNoteResponse(note);
}

export async function deleteNote(userId: string, noteId: string): Promise<void> {
  const result = await NoteModel.findOneAndDelete({ _id: noteId, userId });
  if (!result) {
    throw new AppError("Note not found", 404);
  }
}
