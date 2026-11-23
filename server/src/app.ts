import path from "node:path";
import express, { type Express } from "express";
import type { Logger } from "pino";
import { pinoHttp } from "pino-http";
import { healthCheck } from "./http/health.js";
import type { Config } from "./config.js";
import type { VerifyIdToken } from "./auth/googleVerifier.js";
import { apiNotFound, errorHandler } from "./http/errors.js";
import { httpLoggerOptions } from "./http/logger.js";
import { securityHeaders, writeGuard } from "./http/security.js";

export interface AppDeps {
  config: Config;
  logger: Logger;
  verifyIdToken: VerifyIdToken;
}

export function createApp({ config, logger }: AppDeps): Express {
  const app = express();
  app.set("trust proxy", 1);
  app.use(securityHeaders());
  app.use(pinoHttp(httpLoggerOptions(logger)));
  app.get("/healthz", healthCheck(config.commit));
  app.use(["/auth", "/api"], express.json(), writeGuard(config.appOrigin));
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
