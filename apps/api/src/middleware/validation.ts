import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { err } from "../utils/response";

export function validate(schema: ZodSchema, source: "body" | "query" | "params" = "body") {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const first = result.error.issues[0];
      return err(res, "validation_error", first?.message || "Invalid request", 400, first?.path.join("."));
    }
    next();
  };
}
