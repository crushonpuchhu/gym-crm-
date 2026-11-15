import { Response } from "express";

export function ok<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({ success: true, data });
}

export function err(
  res: Response,
  code: string,
  message: string,
  status = 400,
  field?: string,
) {
  return res.status(status).json({ success: false, error: { code, message, field } });
}
