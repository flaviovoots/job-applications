import path from "node:path";
import express, { type Express } from "express";
import mongoose from "mongoose";
import type { Logger } from "pino";
import { pinoHttp } from "pino-http";
import { applicationsRouter } from "./applications/routes.js";
import { healthCheck } from "./http/health.js";
import type { Config } from "./config.js";
import type { VerifyIdToken } from "./auth/googleVerifier.js";
import { requireAuth } from "./auth/requireAuth.js";
import { authRouter, meRouter } from "./auth/routes.js";
import { sessionMiddleware } from "./auth/session.js";
import { apiNotFound, errorHandler } from "./http/errors.js";
import { httpLoggerOptions } from "./http/logger.js";
import { securityHeaders, writeGuard } from "./http/security.js";

export interface AppDeps {
  config: Config;
  logger: Logger;
  verifyIdToken: VerifyIdToken;
}

// Call after mongoose.connect(): the session store uses the connected client.
export function createApp({ config, logger, verifyIdToken }: AppDeps): Express {
  const getAllowlist = () => config.allowedEmails;
  const app = express();
  app.set("trust proxy", 1);
  app.use(securityHeaders());
  app.use(pinoHttp(httpLoggerOptions(logger)));
  app.get("/healthz", healthCheck(config.commit));
  app.use(
    ["/auth", "/api"],
    express.json(),
    sessionMiddleware({
      secret: config.sessionSecret,
      client: mongoose.connection.getClient(),
    }),
    writeGuard(config.appOrigin),
  );
  app.use("/auth", authRouter({ verifyIdToken, getAllowlist }));
  app.use("/api", requireAuth(getAllowlist), meRouter());
  app.use("/api/applications", applicationsRouter());
  app.use(["/api", "/auth"], apiNotFound);
  app.use(
    "/assets",
    express.static(path.join(config.clientDir, "assets"), {
      maxAge: "1y",
      immutable: true,
      fallthrough: false,
    }),
  );
  app.use(express.static(config.clientDir, { index: false }));
  app.get("/{*splat}", (_req, res) => {
    res.sendFile(path.join(config.clientDir, "index.html"), {
      headers: { "Cache-Control": "no-cache" },
    });
  });
  app.use(errorHandler);
  return app;
}
