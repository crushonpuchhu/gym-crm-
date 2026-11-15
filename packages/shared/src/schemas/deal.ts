import { z } from "zod";

export const createDealSchema = z.object({
  pipelineId: z.string().min(1),
  stageId: z.string().min(1),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
  title: z.string().min(1).max(200),
  value: z.coerce.number().nonnegative(),
  probability: z.coerce.number().min(0).max(100).default(0),
  expectedCloseAt: z.string().datetime().optional(),
});

export const updateDealSchema = createDealSchema.partial();

export const dealQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  pipelineId: z.string().optional(),
  stageId: z.string().optional(),
  ownerId: z.string().optional(),
  search: z.string().optional(),
});

export type CreateDealInput = z.infer<typeof createDealSchema>;
export type UpdateDealInput = z.infer<typeof updateDealSchema>;
export type DealQueryInput = z.infer<typeof dealQuerySchema>;
