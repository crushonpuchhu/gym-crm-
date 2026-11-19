/**
 * Client mirror of the API role catalogue (`apps/api/src/config/permissions.ts`).
 *
 * The server is authoritative; this copy exists so the staff screen can explain
 * what each role can do before the invite is sent.
 */
export interface RoleMeta {
  key: string;
  label: string;
  department: "Ownership" | "Operations" | "Sales" | "Support" | "Read only";
  description: string;
  can: string[];
}

export const ROLES: RoleMeta[] = [
  {
    key: "ORG_OWNER",
    label: "Gym owner",
    department: "Ownership",
    description: "Full control of the brand: staff, roles, billing, settings and every record.",
    can: ["Everything", "Billing", "Staff & roles", "Delete records"],
  },
  {
    key: "ORG_ADMIN",
    label: "Brand admin",
    department: "Operations",
    description: "Runs the brand day to day: staff, clubs, plans, pipelines and reporting.",
    can: ["Staff & roles", "Clubs & plans", "Reports", "All records"],
  },
  {
    key: "CLUB_MANAGER",
    label: "Club manager",
    department: "Operations",
    description: "Runs one or more clubs: members, contracts, check-ins, tickets and reporting.",
    can: ["Members & contracts", "Check-ins", "Tickets", "Reports"],
  },
  {
    key: "MEMBERSHIP_ADVISOR",
    label: "Membership advisor",
    department: "Sales",
    description: "Works the sales funnel: prospects, tours, trials, conversions and member records.",
    can: ["Prospects", "Trials & tours", "Contracts", "Check-ins"],
  },
  {
    key: "SUPPORT_MANAGER",
    label: "Support manager",
    department: "Support",
    description: "Owns the support inbox, SLA, internal notes and support reporting.",
    can: ["Support inbox", "Internal notes", "Assign tickets", "Reports"],
  },
  {
    key: "SUPPORT_AGENT",
    label: "Support agent",
    department: "Support",
    description: "Answers member tickets and logs follow-up tasks.",
    can: ["Support inbox", "Reply to members", "Tasks"],
  },
  {
    key: "VIEWER",
    label: "Viewer",
    department: "Read only",
    description: "Reads dashboards and records without changing anything.",
    can: ["Dashboards", "Record lists"],
  },
];

export const roleMeta = (key: string) => ROLES.find((role) => role.key === key);

export const roleLabel = (key: string) => roleMeta(key)?.label ?? key.replace(/_/g, " ");

/** Roles the signed-in user may hand out, mirroring the server's rank rule. */
export function assignableRoles(actorRole: string | undefined): RoleMeta[] {
  if (!actorRole) return [];
  if (actorRole === "ORG_OWNER" || actorRole === "SUPER_ADMIN") return ROLES;
  if (actorRole === "ORG_ADMIN") return ROLES.filter((role) => role.key !== "ORG_OWNER");
  return [];
}
