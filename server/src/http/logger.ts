import { randomUUID } from "node:crypto";
import {
  pino,
  type DestinationStream,
  type LevelWithSilent,
  type Logger,
} from "pino";
import type { Options } from "pino-http";

export interface LoggerOptions {
  destination?: DestinationStream;
  level?: LevelWithSilent;
}

export function createLogger({
  destination,
  level = "info",
}: LoggerOptions = {}): Logger {
  return pino(
    {
      level,
      redact: [
        "req.headers.cookie",
        "req.headers.authorization",
        'res.headers["set-cookie"]',
      ],
    },
    destination,
  );
}

export function httpLoggerOptions(logger: Logger): Options {
  return {
    logger,
    genReqId: (_req, res) => {
      const id = randomUUID();
      res.setHeader("X-Request-Id", id);
      return id;
    },
  };
}
