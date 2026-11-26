import { Router } from "express";
import type { Status } from "../../../shared/fields.js";
import { HttpError } from "../http/errors.js";
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

  router.get("/:id", async (req, res) => {
    const doc = await repo.getActive(req.user!.id, req.params.id);
    if (doc === null) throw new HttpError(404, "Not found");
    res.json(doc);
  });

  router.patch("/:id", async (req, res) => {
    const { status, ...fields } = normalizeInput(req.body, { partial: true });
    // normalizeInput leaves status out or gives it as non-empty text; the
    // schema's enum checks it is a Status (runValidators).
    const doc = await repo.updateActive(
      req.user!.id,
      req.params.id,
      fields,
      status as Status | undefined,
    );
    if (doc === null) throw new HttpError(404, "Not found");
    res.json(doc);
  });

  router.delete("/:id", async (req, res) => {
    const result = await repo.trash(req.user!.id, req.params.id);
    if (result.matchedCount === 0) throw new HttpError(404, "Not found");
    res.status(204).end();
  });

  return router;
}
