import { promisify } from "node:util";
import type { RequestHandler } from "express";
import { HttpError } from "../http/errors.js";
import { isAllowed } from "./allowlist.js";

// The allowlist is checked again on every request, so removing an email
// ends that account's session.
export function requireAuth(getAllowlist: () => Set<string>): RequestHandler {
  return async (req, _res, next) => {
    const { userId, email } = req.session;
    if (!userId || !email) {
      throw new HttpError(401, "Not signed in");
    }
    if (!isAllowed(getAllowlist(), email)) {
      await promisify(req.session.destroy.bind(req.session))();
      throw new HttpError(401, "Not signed in");
    }
    req.user = { id: userId, email };
    next();
  };
}
