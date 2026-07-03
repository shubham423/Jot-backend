/**
 * LAYER RESPONSIBILITY: The actual entry point of the program. Connects
 * to MongoDB, THEN starts the HTTP server - in that order, deliberately.
 *
 * WHY connect to the DB before calling `.listen()`?
 * If we started accepting HTTP traffic before the database connection
 * was ready, early requests could fail in confusing ways (or Mongoose's
 * internal command buffering could mask the problem temporarily, only to
 * fail later). Awaiting the connection first means: if the DB is
 * unreachable, the server fails to start at all, loudly, immediately -
 * which is much easier to diagnose than a server that "looks" up but
 * can't actually serve any data.
 */

import { env } from "./config/env";
import { connectDB } from "./config/db";
import { createApp } from "./app";

async function main(): Promise<void> {
  await connectDB();

  const app = createApp();

  app.listen(env.port, () => {
    console.log(`Server listening on http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
