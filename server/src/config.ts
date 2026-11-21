import path from "node:path";
import { parseAllowlist } from "./auth/allowlist.js";

export interface Config {
  mongodbUri: string;
  port: number;
  commit: string;
  clientDir: string;
  sessionSecret: string;
  googleClientId: string;
  allowedEmails: Set<string>;
  appOrigin: string;
}

export function readConfig(env: NodeJS.ProcessEnv): Config {
  const problems: string[] = [];

  const mongodbUri = env.MONGODB_URI ?? "";
  if (mongodbUri === "") {
    problems.push("MONGODB_URI is missing");
  }

  let port = 3000;
  const rawPort = env.PORT ?? "";
  if (rawPort !== "") {
    port = Number(rawPort);
    if (!/^\d+$/.test(rawPort) || port < 1 || port > 65535) {
      problems.push("PORT must be a whole number from 1 to 65535");
    }
  }

  const sessionSecret = env.SESSION_SECRET ?? "";
  if (sessionSecret === "") {
    problems.push("SESSION_SECRET is missing");
  } else if (sessionSecret.length < 32) {
    problems.push("SESSION_SECRET must be at least 32 characters");
  }

  const googleClientId = env.GOOGLE_CLIENT_ID ?? "";
  if (googleClientId === "") {
    problems.push("GOOGLE_CLIENT_ID is missing");
  }

  const allowedEmails = parseAllowlist(env.ALLOWED_EMAILS ?? "");
  if (allowedEmails.size === 0) {
    problems.push("ALLOWED_EMAILS is missing");
  }

  const appOrigin = env.APP_ORIGIN ?? "";
  if (appOrigin === "") {
    problems.push("APP_ORIGIN is missing");
  } else if (!isOrigin(appOrigin)) {
    problems.push(
      "APP_ORIGIN must be an origin, with no path or trailing slash",
    );
  }

  if (problems.length > 0) {
    throw new Error(`Invalid environment: ${problems.join("; ")}`);
  }

  return {
    mongodbUri,
    port,
    commit: env.RENDER_GIT_COMMIT || "dev",
    clientDir: path.resolve("client/dist"),
    sessionSecret,
    googleClientId,
    allowedEmails,
    appOrigin,
  };
}

function isOrigin(value: string): boolean {
  return URL.canParse(value) && new URL(value).origin === value;
}
