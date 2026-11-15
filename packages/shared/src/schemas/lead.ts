import { z } from "zod";

export const createLeadSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(50).optional(),
  company: z.string().max(100).optional(),
  source: z.enum(["WEBSITE", "REFERRAL", "COLD_CALL", "EMAIL", "EVENT", "OTHER"]).default("WEBSITE"),
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "CONVERTED", "DISQUALIFIED"]).default("NEW"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  value: z.coerce.number().nonnegative().optional(),
  followUpAt: z.string().datetime().optional(),
});

export const updateLeadSchema = createLeadSchema.partial();

export const leadQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  status: z.string().optional(),
  ownerId: z.string().optional(),
  sortBy: z.string().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type LeadQueryInput = z.infer<typeof leadQuerySchema>;
