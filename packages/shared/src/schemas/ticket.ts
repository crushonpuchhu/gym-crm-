import { z } from "zod";

export const createTicketSchema = z.object({
  customerEmail: z.string().email(),
  customerName: z.string().min(1).max(100),
  subject: z.string().min(1).max(200),
  description: z.string().min(1),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
});

export const updateTicketSchema = z.object({
  subject: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  status: z.enum(["NEW", "OPEN", "PENDING", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  ownerId: z.string().optional(),
});

export const ticketCommentSchema = z.object({
  body: z.string().min(1).max(5000),
  isInternal: z.boolean().default(false),
});

export const ticketQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.string().optional(),
  priority: z.string().optional(),
  ownerId: z.string().optional(),
  search: z.string().optional(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type TicketCommentInput = z.infer<typeof ticketCommentSchema>;
export type TicketQueryInput = z.infer<typeof ticketQuerySchema>;
