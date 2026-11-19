import { once } from "node:events";
import mongoose from "mongoose";
import { createApp } from "./app.js";
import { readConfig } from "./config.js";
import { createLogger } from "./http/logger.js";

const logger = createLogger();

try {
  const config = readConfig(process.env);
  mongoose.set("bufferCommands", false);
  await mongoose.connect(config.mongodbUri);
  const server = createApp({ config, logger }).listen(config.port);
  await once(server, "listening");
  logger.info({ commit: config.commit, port: config.port }, "server started");
} catch (err) {
  logger.fatal({ err }, "startup failed");
  process.exit(1);
}
