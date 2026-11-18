import path from "node:path";

export interface Config {
  mongodbUri: string;
  port: number;
  commit: string;
  clientDir: string;
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

  if (problems.length > 0) {
    throw new Error(`Invalid environment: ${problems.join("; ")}`);
  }

  return {
    mongodbUri,
    port,
    commit: env.RENDER_GIT_COMMIT || "dev",
    clientDir: path.resolve("client/dist"),
  };
}
