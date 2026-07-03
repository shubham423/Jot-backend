/**
 * LAYER RESPONSIBILITY: Own the MongoDB connection lifecycle. Nothing else
 * in the app should call `mongoose.connect` - this is the single place
 * that knows how we talk to the database.
 */

import mongoose from "mongoose";
import { env } from "./env";

export async function connectDB(): Promise<void> {
  // Mongoose buffers commands by default, but it's much easier to debug
  // startup problems if we explicitly await the connection before the
  // HTTP server starts accepting traffic (done in server.ts).
  await mongoose.connect(env.mongodbUri);
  console.log("MongoDB connected");
}
