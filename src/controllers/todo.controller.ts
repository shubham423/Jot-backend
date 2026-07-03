/**
 * LAYER RESPONSIBILITY: Translate HTTP requests into todo.service.ts
 * calls and send responses. Same pattern as note.controller.ts.
 */

import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/apiResponse";
import * as todoService from "../services/todo.service";

export const createTodo = asyncHandler(async (req: Request, res: Response) => {
  const { title, dueDate } = req.body;
  const todo = await todoService.createTodo(req.userId!, title, dueDate);
  sendSuccess(res, 201, todo);
});

export const listTodos = asyncHandler(async (req: Request, res: Response) => {
  const { completed, sort } = req.query as unknown as {
    completed?: boolean;
    sort: "createdAt" | "dueDate";
  };
  const todos = await todoService.listTodos({ userId: req.userId!, completed, sort });
  sendSuccess(res, 200, todos);
});

export const getTodo = asyncHandler(async (req: Request, res: Response) => {
  const todo = await todoService.getTodoById(req.userId!, req.params.id);
  sendSuccess(res, 200, todo);
});

export const updateTodo = asyncHandler(async (req: Request, res: Response) => {
  const todo = await todoService.updateTodo(req.userId!, req.params.id, req.body);
  sendSuccess(res, 200, todo);
});

export const deleteTodo = asyncHandler(async (req: Request, res: Response) => {
  await todoService.deleteTodo(req.userId!, req.params.id);
  sendSuccess(res, 200, { deleted: true });
});
