import "express-session";

declare module "express-session" {
  interface SessionData {
    userId: string;
    email: string;
  }
}

declare global {
  namespace Express {
    interface Request {
      // Set by requireAuth, so every /api route can read it.
      user?: { id: string; email: string };
    }
  }
}
