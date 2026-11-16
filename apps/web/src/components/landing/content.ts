export type Customer = {
  name: string;
  industry: string;
  seats: string;
  cover: string;
  summary: string;
  challenge: string;
  change: string;
  metrics: { label: string; value: string }[];
  modules: string[];
};

export const brand = {
  first: "Sales",
  second: "Flow",
  email: "hello@salesflow.app",
  kicker: "Revenue platform · Since 2019",
  lede:
    "Leads, contacts, deals, tickets and reports on one record set. One workspace, one pipeline, one source of truth — for teams that sell, support and grow.",
};

export const stats = [
  { label: "Running since", value: "2019", suffix: "" },
  { label: "Deals closed", value: "38", suffix: "k+", countTo: 38 },
  { label: "Uptime", value: "99.9", suffix: "%" },
];

export const milestones = [
  {
    year: "2019",
    tag: "Start",
    icon: "layers",
    text: "One pipeline and a spreadsheet-killer. SalesFlow began as an internal tool for a six-person sales team.",
  },
  {
    year: "2021",
    tag: "Pipeline",
    icon: "board",
    text: "Custom stages, shared views and weighted forecasts shipped. The forecast stopped living in someone's head.",
  },
  {
    year: "2023",
    tag: "Workflows",
    icon: "flow",
    text: "Rules, tasks and SLAs became one automation layer across sales and support — no more copy-paste handoffs.",
  },
  {
    year: "2025",
    tag: "AI assist",
    icon: "spark",
    text: "Summaries, next-best actions and deal-risk signals, grounded in your own record history. Not a chatbot bolted on.",
  },
  {
    year: "2026",
    tag: "Multi-tenant",
    icon: "shield",
    text: "Workspaces, roles, permissions and audit trails. One platform, many teams, zero data bleed between tenants.",
  },
];

export const beyond = {
  image: "/media/raw-collab.jpg",
  lines: ["Pipeline owner", "Support desk", "Forecaster", "Wannabe revenue scientist"],
  note: "Whatever the job title says, the work happens in one place.",
};

export const modules = [
  {
    name: "Leads",
    x: -0.27,
    y: -0.1,
    z: 0.5,
    mx: 0,
    my: -0.26,
    mz: 0.1,
    detail: ["Capture", "Scoring", "Routing", "Conversion"],
  },
  {
    name: "Pipeline",
    x: 0.26,
    y: 0.2,
    z: 0.18,
    mx: 0,
    my: -0.14,
    mz: 0.2,
    detail: ["Stages", "Deals", "Forecast", "Win reasons"],
  },
  {
    name: "Support",
    x: 0.29,
    y: -0.24,
    z: 0.85,
    mx: 0,
    my: -0.02,
    mz: 0.05,
    detail: ["Tickets", "SLA", "Owners", "Internal notes"],
  },
  {
    name: "Automation",
    x: -0.2,
    y: 0.27,
    z: -0.12,
    mx: 0,
    my: 0.1,
    mz: 0.15,
    detail: ["Rules", "Tasks", "Handoffs", "Reminders"],
  },
  {
    name: "Reports",
    x: -0.02,
    y: 0.04,
    z: 1.2,
    mx: 0,
    my: 0.22,
    mz: 0.25,
    detail: ["Dashboards", "CSV export", "Activity", "Attribution"],
  },
];

export const work = {
  heading1: "Customer",
  heading2: "Stories",
  note: "Six teams · More soon",
};

export const customers: Customer[] = [
  {
    name: "Acme Co",
    industry: "SaaS",
    seats: "240 seats",
    cover: "/media/raw-team.jpg",
    summary: "One pipeline for new business, expansion and renewals.",
    challenge:
      "Three teams kept three pipelines. Forecast calls meant rebuilding the same spreadsheet every Friday.",
    change:
      "Acme moved new business, expansion and renewals into one tenant with shared stages and a single activity trail. Managers review the live board instead of a deck.",
    metrics: [
      { label: "Forecast prep", value: "−6 hrs/wk" },
      { label: "Stage hygiene", value: "98%" },
      { label: "Win rate", value: "+11 pts" },
    ],
    modules: ["Pipeline", "Reports", "Automation"],
  },
  {
    name: "Globex",
    industry: "Manufacturing",
    seats: "1,200 seats",
    cover: "/media/raw-meeting.jpg",
    summary: "Quote-to-order handoffs that nobody has to chase.",
    challenge:
      "Quotes left the CRM at signature. Order status, service tickets and renewals lived in three systems.",
    change:
      "Globex runs the full record — contact, quote, ticket, renewal — with role-based access per business unit and an audit trail on every change.",
    metrics: [
      { label: "Handoff time", value: "−64%" },
      { label: "Duplicate records", value: "−91%" },
      { label: "Quote cycle", value: "4.1 days" },
    ],
    modules: ["Deals", "Tickets", "Permissions"],
  },
  {
    name: "Initech",
    industry: "Fintech",
    seats: "85 seats",
    cover: "/media/raw-dashboard.jpg",
    summary: "A forecast the board trusts, built from real records.",
    challenge:
      "A ten-person sales team, a fifty-row spreadsheet and no shared definition of qualified.",
    change:
      "Weighted stages, required fields at each gate and an exportable report pack. The board sees the same numbers the reps do.",
    metrics: [
      { label: "Report build", value: "−9 hrs" },
      { label: "Stale deals", value: "−47%" },
      { label: "Quota attainment", value: "104%" },
    ],
    modules: ["Pipeline", "Reports", "Workflows"],
  },
  {
    name: "Umbrella Health",
    industry: "Healthcare",
    seats: "3,400 seats",
    cover: "/media/raw-office.jpg",
    summary: "Support and sales on one tenant, with strict separation.",
    challenge:
      "Clinical and commercial teams could not share a workspace without exposing patient-adjacent data.",
    change:
      "Umbrella uses scoped roles and ticket-level restrictions, with internal comments hidden from requesters and every permission change logged.",
    metrics: [
      { label: "First response", value: "−38%" },
      { label: "Escalations", value: "−22%" },
      { label: "Audit findings", value: "0" },
    ],
    modules: ["Tickets", "Roles", "Audit log"],
  },
  {
    name: "Soylent Logistics",
    industry: "Logistics",
    seats: "600 seats",
    cover: "/media/raw-collab.jpg",
    summary: "Every account, every depot, one shared view.",
    challenge:
      "Depot managers kept local account lists. Head office found out about churn from the invoice.",
    change:
      "A tenant per region, a shared customer record and renewal tasks that fire 90 days out. Churn conversations start early.",
    metrics: [
      { label: "Renewal visibility", value: "90 days" },
      { label: "Cycle time", value: "−19%" },
      { label: "Account coverage", value: "100%" },
    ],
    modules: ["Contacts", "Tasks", "Automation"],
  },
  {
    name: "Vandelay Imports",
    industry: "Import / Export",
    seats: "40 seats",
    cover: "/media/raw-notes.jpg",
    summary: "Small team, short cycle, no admin tax.",
    challenge:
      "Two partners, one shared inbox and a CRM that took longer to update than the sale took to close.",
    change:
      "Fast capture, keyboard-first deal updates and a single board. Pipeline review is a five-minute Monday habit.",
    metrics: [
      { label: "Admin per deal", value: "−52%" },
      { label: "Response time", value: "1.4 hrs" },
      { label: "Adoption", value: "100%" },
    ],
    modules: ["Leads", "Pipeline", "Inbox"],
  },
];

export const product = {
  badge: "The product",
  headline: ["The revenue workspace", "teams actually open."],
  body:
    "Every lead, deal, ticket and report on one record set. Install it, invite the team, and run your first pipeline in an afternoon. No migration project, no per-seat surprises.",
  steps: ["Leads", "Pipeline", "Inbox", "Reports"],
  cta: { label: "Open the live demo", href: "/login" },
  video: "/media/hero-pipeline.mp4",
  poster: "/media/hero-poster.jpg",
  meta: "2 min walkthrough · Demo data included",
};

export const contact = {
  headline: "Let's make quota",
  email: brand.email,
  links: [
    { label: "Live demo", href: "/login" },
    { label: "Create workspace", href: "/register" },
    { label: "Modules", href: "#services" },
    { label: "Customers", href: "#work" },
    { label: "Sign in", href: "/login" },
  ],
  copyright: "© 2026 SalesFlow",
};

export const nav = [
  { n: "01", label: "Home", href: "#hero", target: "hero" },
  { n: "02", label: "About", href: "#about", target: "about" },
  { n: "03", label: "Journey", href: "#journey", target: "journey" },
  { n: "04", label: "What it does", href: "#services", target: "services" },
  { n: "05", label: "Customers", href: "#work", target: "work" },
  { n: "06", label: "The product", href: "#product-stop", target: "product-stop" },
  { n: "07", label: "Contact", href: "#contact", target: "contact" },
];
