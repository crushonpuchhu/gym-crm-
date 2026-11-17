import type { Metadata } from "next";
import Landing from "@/components/landing/Landing";

export const metadata: Metadata = {
  title: "GymFlow — Member CRM for gym brands and clubs",
  description:
    "GymFlow is a multi-tenant gym CRM for prospects, members, membership plans, contracts, check-ins, support tickets and retention reporting. One member record across every club.",
  openGraph: {
    title: "GymFlow — Member CRM for gym brands and clubs",
    description:
      "Prospects, memberships, check-ins, support and club reports on a single record set. Tenant-isolated and audit-ready.",
    type: "website",
  },
};

export default function Home() {
  return <Landing />;
}
