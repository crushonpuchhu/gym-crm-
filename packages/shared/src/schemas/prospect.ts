import { z } from "zod";

export const PROSPECT_SOURCES = [
  "WALK_IN",
  "WEBSITE",
  "REFERRAL",
  "INSTAGRAM",
  "FACEBOOK",
  "GOOGLE",
  "EVENT",
  "PARTNER",
  "OTHER",
] as const;

export const PROSPECT_STATUSES = [
  "NEW",
  "CONTACTED",
  "TOUR_BOOKED",
  "TOURED",
  "TRIAL",
  "NEGOTIATING",
  "JOINED",
  "LOST",
] as const;

export const createProspectSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(50).optional(),
  locationId: z.string().uuid().optional(),
  source: z.enum(PROSPECT_SOURCES).default("WALK_IN"),
  status: z.enum(PROSPECT_STATUSES).default("NEW"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  fitnessGoal: z.string().max(200).optional(),
  value: z.coerce.number().nonnegative().optional(),
  followUpAt: z.string().datetime().optional(),
});

export const updateProspectSchema = createProspectSchema.partial();

export const prospectQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  status: z.string().optional(),
  ownerId: z.string().optional(),
  locationId: z.string().optional(),
  sortBy: z.string().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateProspectInput = z.infer<typeof createProspectSchema>;
export type UpdateProspectInput = z.infer<typeof updateProspectSchema>;
export type ProspectQueryInput = z.infer<typeof prospectQuerySchema>;
