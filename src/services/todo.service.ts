/**
 * LAYER RESPONSIBILITY: Business logic + DB access for todos. Just like
 * note.service.ts, every function scopes its query by the authenticated
 * `userId` so users can never touch each other's todos.
 */

import { TodoModel, TodoDocument } from "../models/todo.model";
import { AppError } from "../utils/AppError";

interface TodoResponse {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

function toTodoResponse(todo: TodoDocument): TodoResponse {
  return {
    id: todo._id.toString(),
    title: todo.title,
    completed: todo.completed,
    dueDate: todo.dueDate,
    createdAt: todo.createdAt,
    updatedAt: todo.updatedAt,
  };
}

export async function createTodo(
  userId: string,
  title: string,
  dueDate?: Date
): Promise<TodoResponse> {
  const todo = await TodoModel.create({ userId, title, dueDate });
  return toTodoResponse(todo);
}

interface ListTodosParams {
  userId: string;
  completed?: boolean;
  sort: "createdAt" | "dueDate";
}

export async function listTodos(params: ListTodosParams): Promise<TodoResponse[]> {
  const { userId, completed, sort } = params;

  const filter: Record<string, unknown> = { userId };
  if (completed !== undefined) {
    filter.completed = completed;
  }

  // Sorting by dueDate descending puts todos WITH a due date first
  // (Mongo sorts missing/null fields before set ones in ascending order,
  // so descending naturally surfaces dated todos before undated ones);
  // this is a reasonable default for a simple learning app rather than
  // building a more elaborate "nulls last" query.
  const todos = await TodoModel.find(filter).sort({ [sort]: -1 });

  return todos.map(toTodoResponse);
}

export async function getTodoById(userId: string, todoId: string): Promise<TodoResponse> {
  const todo = await TodoModel.findOne({ _id: todoId, userId });
  if (!todo) {
    throw new AppError("Todo not found", 404);
  }
  return toTodoResponse(todo);
}

export async function updateTodo(
  userId: string,
  todoId: string,
  updates: { title?: string; completed?: boolean; dueDate?: Date }
): Promise<TodoResponse> {
  const todo = await TodoModel.findOneAndUpdate(
    { _id: todoId, userId },
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!todo) {
    throw new AppError("Todo not found", 404);
  }
  return toTodoResponse(todo);
}

export async function deleteTodo(userId: string, todoId: string): Promise<void> {
  const result = await TodoModel.findOneAndDelete({ _id: todoId, userId });
  if (!result) {
    throw new AppError("Todo not found", 404);
  }
}
