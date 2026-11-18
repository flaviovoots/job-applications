import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";

export class HttpError extends Error {
  readonly status: number;
  readonly error: string;
  readonly fields: Record<string, string> | undefined;

  constructor(status: number, error: string, fields?: Record<string, string>) {
    super(error);
    this.name = "HttpError";
    this.status = status;
    this.error = error;
    this.fields = fields;
  }
}

function sendError(
  req: Request,
  res: Response,
  status: number,
  error: string,
  fields?: Record<string, string>,
): void {
  res.status(status).json({ error, fields, requestId: req.id });
}

function clientErrorStatus(err: unknown): number | undefined {
  if (typeof err !== "object" || err === null || !("status" in err)) {
    return undefined;
  }
  const { status } = err;
  return typeof status === "number" && status >= 400 && status < 500
    ? status
    : undefined;
}

export function apiNotFound(req: Request, res: Response): void {
  sendError(req, res, 404, "Not found");
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(err);
    return;
  }
  if (err instanceof HttpError) {
    sendError(req, res, err.status, err.error, err.fields);
    return;
  }
  if (err instanceof mongoose.Error.CastError) {
    sendError(req, res, 404, "Not found");
    return;
  }
  const status = clientErrorStatus(err);
  if (status !== undefined) {
    sendError(
      req,
      res,
      status,
      status === 404 ? "Not found" : "Invalid request body",
    );
    return;
  }
  res.err = err instanceof Error ? err : new Error(String(err));
  sendError(req, res, 500, "Something went wrong");
}
