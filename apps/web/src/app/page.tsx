import type { Metadata } from "next";
import Landing from "@/components/landing/Landing";

export const metadata: Metadata = {
  title: "SalesFlow CRM — One workspace for every revenue motion",
  description:
    "SalesFlow is a multi-tenant CRM for leads, contacts, deals, support tickets, workflows and reporting. One record set, one pipeline, one source of truth.",
  openGraph: {
    title: "SalesFlow CRM — One workspace for every revenue motion",
    description:
      "Leads, pipeline, tickets, workflows and reports on a single record set. Tenant-isolated and audit-ready.",
    type: "website",
  },
};

export default function Home() {
  return <Landing />;
}
