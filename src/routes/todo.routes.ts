/**
 * LAYER RESPONSIBILITY: Wire todo URLs to their middleware chain and
 * controllers. See note.routes.ts for the general pattern explanation.
 *
 * Note the spec asks for PATCH (not PUT) for todo updates - PATCH is the
 * semantically correct verb here since updates are partial (e.g. just
 * toggling `completed`), and our updateTodoSchema already only requires
 * "at least one field", matching PATCH's "partial update" meaning.
 */

import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { objectIdParamSchema } from "../schemas/common.schema";
import {
  createTodoSchema,
  updateTodoSchema,
  listTodosQuerySchema,
} from "../schemas/todo.schema";
import {
  createTodo,
  listTodos,
  getTodo,
  updateTodo,
  deleteTodo,
} from "../controllers/todo.controller";

const router = Router();

router.use(requireAuth);

router.post("/", validate(createTodoSchema), createTodo);
router.get("/", validate(listTodosQuerySchema), listTodos);
router.get("/:id", validate(objectIdParamSchema), getTodo);
router.patch("/:id", validate(objectIdParamSchema), validate(updateTodoSchema), updateTodo);
router.delete("/:id", validate(objectIdParamSchema), deleteTodo);

export default router;
