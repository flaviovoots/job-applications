import type { RequestHandler } from "express";
import mongoose from "mongoose";

export function healthCheck(commit: string): RequestHandler {
  return (_req, res) => {
    if (
      mongoose.connection.readyState === mongoose.ConnectionStates.connected
    ) {
      res.json({ status: "ok", db: "up", commit });
    } else {
      res.status(503).json({ status: "degraded", db: "down", commit });
    }
  };
}
