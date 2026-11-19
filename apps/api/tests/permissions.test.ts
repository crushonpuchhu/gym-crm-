import { describe, it, expect } from "vitest";
import { z } from "zod";
import { canAssignRole, hasPermission, ROLE_PERMISSIONS } from "../src/config/permissions";

describe("role permissions", () => {
  it("keeps the owner and platform admin unrestricted", () => {
    expect(hasPermission("ORG_OWNER", "manage_billing")).toBe(true);
    expect(hasPermission("ORG_OWNER", "any_future_permission")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "manage_users")).toBe(true);
  });

  it("lets advisors work the funnel but not staff or billing", () => {
    expect(hasPermission("MEMBERSHIP_ADVISOR", "manage_prospects")).toBe(true);
    expect(hasPermission("MEMBERSHIP_ADVISOR", "manage_memberships")).toBe(true);
    expect(hasPermission("MEMBERSHIP_ADVISOR", "manage_users")).toBe(false);
    expect(hasPermission("MEMBERSHIP_ADVISOR", "manage_billing")).toBe(false);
  });

  it("keeps viewers read only and rejects unknown roles", () => {
    expect(ROLE_PERMISSIONS.VIEWER).toEqual([]);
    expect(hasPermission("VIEWER", "manage_members")).toBe(false);
    expect(hasPermission(undefined, "manage_members")).toBe(false);
    expect(hasPermission("NOT_A_ROLE", "manage_members")).toBe(false);
  });

  it("stops support agents from seeing internal-only permissions", () => {
    expect(hasPermission("SUPPORT_AGENT", "manage_tickets")).toBe(true);
    expect(hasPermission("SUPPORT_AGENT", "manage_tickets_internal")).toBe(false);
    expect(hasPermission("SUPPORT_MANAGER", "manage_tickets_internal")).toBe(true);
  });
});

describe("role assignment ceiling", () => {
  it("lets the owner grant any gym role but never platform admin", () => {
    expect(canAssignRole("ORG_OWNER", "ORG_OWNER")).toBe(true);
    expect(canAssignRole("ORG_OWNER", "ORG_ADMIN")).toBe(true);
    expect(canAssignRole("ORG_OWNER", "VIEWER")).toBe(true);
    expect(canAssignRole("ORG_OWNER", "SUPER_ADMIN")).toBe(false);
  });

  it("stops an admin from minting owners or admins above themselves", () => {
    expect(canAssignRole("ORG_ADMIN", "ORG_OWNER")).toBe(false);
    expect(canAssignRole("ORG_ADMIN", "ORG_ADMIN")).toBe(true);
    expect(canAssignRole("ORG_ADMIN", "CLUB_MANAGER")).toBe(true);
  });

  it("gives managers and advisors no role-granting power", () => {
    expect(canAssignRole("CLUB_MANAGER", "VIEWER")).toBe(false);
    expect(canAssignRole("MEMBERSHIP_ADVISOR", "SUPPORT_AGENT")).toBe(false);
    expect(canAssignRole(undefined, "VIEWER")).toBe(false);
  });
});

describe("invitation payload", () => {
  const schema = z.object({ email: z.string().email(), role: z.enum(["ORG_ADMIN", "MEMBERSHIP_ADVISOR", "VIEWER"]) });

  it("accepts a valid invite", () => {
    expect(schema.safeParse({ email: "a@b.com", role: "VIEWER" }).success).toBe(true);
  });

  it("rejects unknown roles and bad emails", () => {
    expect(schema.safeParse({ email: "a@b.com", role: "SUPER_ADMIN" }).success).toBe(false);
    expect(schema.safeParse({ email: "nope", role: "VIEWER" }).success).toBe(false);
  });
});
