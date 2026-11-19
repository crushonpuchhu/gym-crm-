/**
 * Role and permission catalogue.
 *
 * One gym brand is one organization. Every staff account joins that
 * organization through a TeamMembership carrying exactly one role, so access is
 * decided by (organization, role) — never by the user alone.
 *
 * Permissions are coarse capabilities rather than per-endpoint flags: a route
 * declares the capability it needs and a role either holds it or does not.
 * `*` is reserved for the platform-level SUPER_ADMIN and the brand owner.
 */

export const PERMISSIONS = {
  manageOrg: "manage_org",
  manageUsers: "manage_users",
  manageBilling: "manage_billing",
  viewReports: "view_reports",
  viewAuditLogs: "view_audit_logs",
  managePipelines: "manage_pipelines",
  manageProspects: "manage_prospects",
  manageMembers: "manage_members",
  manageMemberships: "manage_memberships",
  manageCheckins: "manage_checkins",
  manageTickets: "manage_tickets",
  manageTicketsInternal: "manage_tickets_internal",
  manageTasks: "manage_tasks",
  manageAutomations: "manage_automations",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export interface RoleDefinition {
  key: string;
  label: string;
  /** Where this role usually sits in a gym, used for grouping in the UI. */
  department: "Ownership" | "Operations" | "Sales" | "Support" | "Read only" | "Platform";
  description: string;
  permissions: string[];
}

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    key: "ORG_OWNER",
    label: "Gym owner",
    department: "Ownership",
    description: "Full control of the brand: staff, roles, billing, settings and every record.",
    permissions: ["*"],
  },
  {
    key: "ORG_ADMIN",
    label: "Brand admin",
    department: "Operations",
    description: "Runs the brand day to day: staff, clubs, plans, pipelines and reporting. No ownership transfer.",
    permissions: [
      PERMISSIONS.manageOrg,
      PERMISSIONS.manageUsers,
      PERMISSIONS.manageBilling,
      PERMISSIONS.viewReports,
      PERMISSIONS.viewAuditLogs,
      PERMISSIONS.managePipelines,
      PERMISSIONS.manageProspects,
      PERMISSIONS.manageMembers,
      PERMISSIONS.manageMemberships,
      PERMISSIONS.manageCheckins,
      PERMISSIONS.manageTickets,
      PERMISSIONS.manageTicketsInternal,
      PERMISSIONS.manageTasks,
      PERMISSIONS.manageAutomations,
    ],
  },
  {
    key: "CLUB_MANAGER",
    label: "Club manager",
    department: "Operations",
    description: "Runs one or more clubs: members, contracts, check-ins, tickets and local reporting.",
    permissions: [
      PERMISSIONS.viewReports,
      PERMISSIONS.managePipelines,
      PERMISSIONS.manageProspects,
      PERMISSIONS.manageMembers,
      PERMISSIONS.manageMemberships,
      PERMISSIONS.manageCheckins,
      PERMISSIONS.manageTickets,
      PERMISSIONS.manageTasks,
    ],
  },
  {
    key: "MEMBERSHIP_ADVISOR",
    label: "Membership advisor",
    department: "Sales",
    description: "Works the sales funnel: prospects, tours, trials, conversions and member records.",
    permissions: [
      PERMISSIONS.manageProspects,
      PERMISSIONS.manageMembers,
      PERMISSIONS.manageMemberships,
      PERMISSIONS.manageCheckins,
      PERMISSIONS.manageTasks,
    ],
  },
  {
    key: "SUPPORT_MANAGER",
    label: "Support manager",
    department: "Support",
    description: "Owns the support inbox, SLA, internal notes and support reporting.",
    permissions: [
      PERMISSIONS.viewReports,
      PERMISSIONS.manageTickets,
      PERMISSIONS.manageTicketsInternal,
      PERMISSIONS.manageTasks,
    ],
  },
  {
    key: "SUPPORT_AGENT",
    label: "Support agent",
    department: "Support",
    description: "Answers member tickets and logs follow-up tasks. No internal-only notes.",
    permissions: [PERMISSIONS.manageTickets, PERMISSIONS.manageTasks],
  },
  {
    key: "VIEWER",
    label: "Viewer",
    department: "Read only",
    description: "Reads dashboards and records without changing anything.",
    permissions: [],
  },
  {
    key: "SUPER_ADMIN",
    label: "Platform admin",
    department: "Platform",
    description: "GymFlow operator. Not assignable inside a gym brand.",
    permissions: ["*"],
  },
];

export const ROLE_PERMISSIONS: Record<string, string[]> = Object.fromEntries(
  ROLE_DEFINITIONS.map((role) => [role.key, role.permissions]),
);

/** Roles a gym can hand out. SUPER_ADMIN is platform-only. */
export const ASSIGNABLE_ROLES = ROLE_DEFINITIONS.filter((r) => r.key !== "SUPER_ADMIN").map((r) => r.key);

/**
 * Privilege ceiling: an actor may only grant roles at or below their own rank.
 * Rank is the index in the ordered list, so the owner (0) can grant anything,
 * an admin cannot mint another owner, and everyone else stays below admin.
 */
const ROLE_RANK: Record<string, number> = {
  SUPER_ADMIN: -1,
  ORG_OWNER: 0,
  ORG_ADMIN: 1,
  CLUB_MANAGER: 2,
  MEMBERSHIP_ADVISOR: 3,
  SUPPORT_MANAGER: 3,
  SUPPORT_AGENT: 4,
  VIEWER: 5,
};

export function canAssignRole(actorRole: string | undefined, targetRole: string): boolean {
  if (!actorRole) return false;
  if (targetRole === "SUPER_ADMIN") return actorRole === "SUPER_ADMIN";
  const actorRank = ROLE_RANK[actorRole] ?? 99;
  const targetRank = ROLE_RANK[targetRole] ?? 99;
  return targetRank >= actorRank && actorRank <= 1;
}

export function hasPermission(role: string | undefined, permission: string): boolean {
  if (!role) return false;
  const grants = ROLE_PERMISSIONS[role] ?? [];
  return grants.includes("*") || grants.includes(permission);
}

export function roleLabel(role: string): string {
  return ROLE_DEFINITIONS.find((r) => r.key === role)?.label ?? role.replace(/_/g, " ");
}
