/**
 * LAYER RESPONSIBILITY: Define the shape and DB-level rules for a Todo
 * document. See user.model.ts for the longer explanation of why Mongoose
 * validation and Zod validation are both needed and not redundant.
 */

import { Schema, model, Document, Types } from "mongoose";

export interface TodoDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  completed: boolean;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const todoSchema = new Schema<TodoDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Same reasoning as Note: every todo query filters by
      // the current user's id, so we index it.
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    dueDate: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

export const TodoModel = model<TodoDocument>("Todo", todoSchema);
