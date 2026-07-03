/**
 * LAYER RESPONSIBILITY: Define the shape and DB-level rules for a Note
 * document. See user.model.ts for the longer explanation of why Mongoose
 * validation and Zod validation are both needed and not redundant.
 */

import { Schema, model, Document, Types } from "mongoose";

export interface NoteDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const noteSchema = new Schema<NoteDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User", // Lets us `.populate("userId")` later if we ever need
      // the full user document from a note - we don't use that today,
      // but `ref` costs nothing to declare and documents the relationship.
      required: true,
      index: true, // Every notes query in note.service.ts filters by
      // userId (we NEVER return notes across users), so this index is
      // what keeps those lookups fast as the collection grows.
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export const NoteModel = model<NoteDocument>("Note", noteSchema);
