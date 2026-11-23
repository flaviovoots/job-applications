import { MongoStore } from "connect-mongo";
import type { RequestHandler } from "express";
import session from "express-session";
import type { MongoClient } from "mongodb";

export const sessionCookie = "sid";

const thirtyDaysInSeconds = 30 * 24 * 60 * 60;

export interface SessionOptions {
  secret: string;
  client: MongoClient;
}

// Sessions are saved only at sign-in, and each request renews the 30 days.
// Behind trust proxy, secure: "auto" gives Secure on Render's HTTPS.
export function sessionMiddleware({
  secret,
  client,
}: SessionOptions): RequestHandler {
  return session({
    name: sessionCookie,
    secret,
    store: MongoStore.create({
      client,
      collectionName: "sessions",
      ttl: thirtyDaysInSeconds,
    }),
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: "auto",
      maxAge: thirtyDaysInSeconds * 1000,
    },
    rolling: true,
    resave: false,
    saveUninitialized: false,
  });
}
