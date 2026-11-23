import type { RequestHandler } from "express";
import helmet from "helmet";
import { HttpError } from "./errors.js";

const googleSignIn = "https://accounts.google.com/gsi/";

export function securityHeaders(): ReturnType<typeof helmet> {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", googleSignIn],
        frameSrc: ["'self'", googleSignIn],
        connectSrc: ["'self'", googleSignIn],
        styleSrc: ["'self'", googleSignIn],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    // Google's button checks the page's origin, which no-referrer hides.
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  });
}

// CSRF defense: every write must come from the app's own origin, and POST and
// PATCH must send JSON, which a cross-site form can't.
export function writeGuard(appOrigin: string): RequestHandler {
  return (req, _res, next) => {
    if (req.method === "GET" || req.method === "HEAD") {
      next();
    } else if (req.get("Origin") !== appOrigin) {
      next(new HttpError(403, "Forbidden"));
    } else if (
      (req.method === "POST" || req.method === "PATCH") &&
      !req.is("application/json")
    ) {
      next(new HttpError(415, "Send JSON"));
    } else {
      next();
    }
  };
}
