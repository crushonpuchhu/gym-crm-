import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

export const apiResponse = <T>(data: T) => ({ success: true, data });
export const apiError = (code: string, message: string, field?: string) => ({
  success: false,
  error: { code, message, field },
});
