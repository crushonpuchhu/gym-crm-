import { z } from "zod";

export const createMembershipSchema = z.object({
  pipelineId: z.string().min(1),
  stageId: z.string().min(1),
  memberId: z.string().optional(),
  planId: z.string().optional(),
  locationId: z.string().optional(),
  title: z.string().min(1).max(200),
  value: z.coerce.number().nonnegative(),
  monthlyValue: z.coerce.number().nonnegative().default(0),
  billingCycle: z.enum(["MONTHLY", "QUARTERLY", "ANNUAL", "ONE_TIME"]).default("MONTHLY"),
  probability: z.coerce.number().min(0).max(100).default(0),
  expectedCloseAt: z.string().datetime().optional(),
});

export const updateMembershipSchema = createMembershipSchema.partial();

export const membershipQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  pipelineId: z.string().optional(),
  stageId: z.string().optional(),
  ownerId: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
});

export type CreateMembershipInput = z.infer<typeof createMembershipSchema>;
export type UpdateMembershipInput = z.infer<typeof updateMembershipSchema>;
export type MembershipQueryInput = z.infer<typeof membershipQuerySchema>;
