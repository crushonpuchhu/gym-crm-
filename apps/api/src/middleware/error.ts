import { Request, Response, NextFunction } from "express";
import { err } from "../utils/response";

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  console.error(err);
  if (err.name === "ZodError") {
    return err(res, "validation_error", "Invalid request", 400);
  }
  if (err.name === "JsonWebTokenError") {
    return err(res, "auth_invalid", "Invalid token", 401);
  }
  if (err.name === "TokenExpiredError") {
    return err(res, "auth_expired", "Token expired", 401);
  }
  if (err.code === "P2002") {
    return err(res, "conflict", "Record already exists", 409);
  }
  if (err.code === "P2025") {
    return err(res, "not_found", "Record not found", 404);
  }
  return err(res, "server_error", "Internal server error", 500);
}

export function notFound(_req: Request, res: Response) {
  return err(res, "not_found", "Route not found", 404);
}
