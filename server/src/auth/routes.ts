import { promisify } from "node:util";
import { Router } from "express";
import { HttpError } from "../http/errors.js";
import { isAllowed } from "./allowlist.js";
import type { VerifyIdToken } from "./googleVerifier.js";
import { sessionCookie } from "./session.js";

export interface AuthRouterDeps {
  verifyIdToken: VerifyIdToken;
  getAllowlist: () => Set<string>;
}

export function authRouter({
  verifyIdToken,
  getAllowlist,
}: AuthRouterDeps): Router {
  const router = Router();

  router.post("/google", async (req, res) => {
    const credential: unknown = req.body?.credential;
    if (typeof credential !== "string" || credential === "") {
      throw new HttpError(400, "Missing credential");
    }
    const identity = await verifyIdToken(credential);
    // The logs name the reason, never the email.
    if (!identity.emailVerified) {
      req.log.info({ reason: "email_unverified" }, "auth.refused");
      throw new HttpError(403, "Not allowed");
    }
    if (!isAllowed(getAllowlist(), identity.email)) {
      req.log.info({ reason: "not_allowed" }, "auth.refused");
      throw new HttpError(403, "Not allowed");
    }
    // A new session id at sign-in, so an id planted earlier is never signed in.
    await promisify(req.session.regenerate.bind(req.session))();
    req.session.userId = identity.sub;
    req.session.email = identity.email;
    await promisify(req.session.save.bind(req.session))();
    req.log.info("auth.signin");
    res.json({ email: identity.email });
  });

  router.post("/logout", async (req, res) => {
    await promisify(req.session.destroy.bind(req.session))();
    res.clearCookie(sessionCookie).status(204).end();
  });

  return router;
}

// Mounted on /api after requireAuth, so req.user is always set.
export function meRouter(): Router {
  const router = Router();

  router.get("/me", (req, res) => {
    res.json({ email: req.user!.email });
  });

  return router;
}
