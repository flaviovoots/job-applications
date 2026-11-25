import { Router } from "express";
import { normalizeInput } from "./input.js";
import * as repo from "./repo.js";

// Mounted on /api/applications after requireAuth, so req.user is always set.
export function applicationsRouter(): Router {
  const router = Router();

  router.get("/", async (req, res) => {
    res.json(await repo.listActive(req.user!.id));
  });

  router.post("/", async (req, res) => {
    const input = normalizeInput(req.body, { partial: false });
    res.status(201).json(await repo.create(req.user!.id, input));
  });

  return router;
}
