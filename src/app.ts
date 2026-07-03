/**
 * LAYER RESPONSIBILITY: Build and configure the Express app object -
 * register global middleware (JSON body parsing) and mount each
 * feature's router under `/api`. This file does NOT connect to the
 * database or call `.listen()` - that's server.ts's job. Splitting these
 * two means we COULD import just `app` into a test file (e.g. with
 * supertest) without ever opening a real port or DB connection.
 *
 * FULL REQUEST FLOW, end to end, for e.g. POST /api/notes:
 *   1. Express matches the URL to note.routes.ts
 *   2. validate(createNoteSchema) middleware checks/transforms req.body
 *   3. requireAuth middleware verifies the JWT, sets req.userId
 *   4. note.controller.ts's createNote reads req.body + req.userId
 *   5. note.service.ts's createNote runs the business logic
 *   6. Note model (Mongoose) validates + saves the document to MongoDB
 *   7. The result flows back up: service returns data -> controller
 *      calls sendSuccess() -> Express sends the JSON response
 *   (If anything throws an AppError at any step, it skips straight to
 *   error.middleware.ts instead of continuing down this chain.)
 */

import express, { Express } from "express";
import authRoutes from "./routes/auth.routes";
import noteRoutes from "./routes/note.routes";
import todoRoutes from "./routes/todo.routes";
import { errorHandler } from "./middleware/error.middleware";
import { AppError } from "./utils/AppError";

export function createApp(): Express {
  const app = express();

  // Parses incoming JSON request bodies into `req.body` - without this,
  // `req.body` would be `undefined` for every request, since Express
  // doesn't parse bodies by default.
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({ success: true, data: { status: "ok" } });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/notes", noteRoutes);
  app.use("/api/todos", todoRoutes);

  // Catch-all for any URL that didn't match a route above. Without this,
  // Express's default 404 page is plain HTML, which breaks our promise
  // to the Android client of a consistent JSON envelope for every
  // response, error or not.
  app.use((req, _res, next) => {
    next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
  });

  // Must be registered LAST. Express identifies "error-handling"
  // middleware by its 4-argument signature, and only routes errors to
  // handlers registered after the point where the error occurred.
  app.use(errorHandler);

  return app;
}
