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
  first: "Gym",
  second: "Flow",
  email: "hello@gymflow.app",
  kicker: "Member CRM · Since 2019",
  lede:
    "Prospects, members, memberships, check-ins and support on one record set. One platform for every club in your brand — so the front desk, the advisors and the owner see the same member.",
};

export const stats = [
  { label: "Running since", value: "2019", suffix: "" },
  { label: "Members managed", value: "120", suffix: "k+", countTo: 120 },
  { label: "Uptime", value: "99.9", suffix: "%" },
];

export const milestones = [
  {
    year: "2019",
    tag: "Start",
    icon: "layers",
    text: "One club, one spreadsheet of members and a whiteboard for tours. GymFlow began as the front-desk tool for a single gym.",
  },
  {
    year: "2021",
    tag: "Contracts",
    icon: "board",
    text: "Membership plans, join dates and pause/cancel handling shipped. Renewals stopped depending on somebody's memory.",
  },
  {
    year: "2023",
    tag: "Check-ins",
    icon: "flow",
    text: "QR, app and front-desk check-ins became one attendance stream — feeding retention reports and win-back automations.",
  },
  {
    year: "2025",
    tag: "Retention",
    icon: "spark",
    text: "Members who stop attending surface before they cancel. Advisors get a list, not a hunch.",
  },
  {
    year: "2026",
    tag: "Multi-club",
    icon: "shield",
    text: "Clubs, roles, permissions and audit trails. One gym brand, many locations, zero data bleed between tenants.",
  },
];

export const beyond = {
  image: "/media/raw-collab.jpg",
  lines: ["Club manager", "Membership advisor", "Front desk", "Retention analyst"],
  note: "Whatever the job title says, the member record is in one place.",
};

export const modules = [
  {
    name: "Prospects",
    x: -0.27,
    y: -0.1,
    z: 0.5,
    mx: 0,
    my: -0.26,
    mz: 0.1,
    detail: ["Walk-ins", "Tours", "Trials", "Conversion"],
  },
  {
    name: "Memberships",
    x: 0.26,
    y: 0.2,
    z: 0.18,
    mx: 0,
    my: -0.14,
    mz: 0.2,
    detail: ["Plans", "Contracts", "Renewals", "Cancellations"],
  },
  {
    name: "Check-ins",
    x: 0.29,
    y: -0.24,
    z: 0.85,
    mx: 0,
    my: -0.02,
    mz: 0.05,
    detail: ["QR", "App", "Front desk", "Attendance"],
  },
  {
    name: "Automation",
    x: -0.2,
    y: 0.27,
    z: -0.12,
    mx: 0,
    my: 0.1,
    mz: 0.15,
    detail: ["Trial follow-up", "Dunning", "Win-back", "Reminders"],
  },
  {
    name: "Reports",
    x: -0.02,
    y: 0.04,
    z: 1.2,
    mx: 0,
    my: 0.22,
    mz: 0.25,
    detail: ["MRR", "Retention", "Traffic", "CSV export"],
  },
];

export const work = {
  heading1: "Gym",
  heading2: "Stories",
  note: "Six brands · More soon",
};

export const customers: Customer[] = [
  {
    name: "Iron Atlas Fitness",
    industry: "3 clubs",
    seats: "2,400 members",
    cover: "/media/raw-team.jpg",
    summary: "Three clubs, one member record, one retention number.",
    challenge:
      "Each club kept its own member list. Head office found out about churn when the direct debit stopped.",
    change:
      "Iron Atlas moved every club into one tenant with shared plans and a single check-in stream. The Monday review reads one dashboard instead of three exports.",
    metrics: [
      { label: "Admin time", value: "−6 hrs/wk" },
      { label: "Member data", value: "One record" },
      { label: "Trial conversion", value: "+11 pts" },
    ],
    modules: ["Memberships", "Reports", "Automation"],
  },
  {
    name: "Northgate Strength Co.",
    industry: "Strength gym",
    seats: "980 members",
    cover: "/media/raw-meeting.jpg",
    summary: "Trials that turn into contracts, without the chasing.",
    challenge:
      "Trial passes were handed out on paper. Nobody knew which trial ended today, so half of them just lapsed.",
    change:
      "Every trial is a prospect with an end date. A workflow creates the follow-up task two days out and the advisor gets a notification.",
    metrics: [
      { label: "Trial → member", value: "+23%" },
      { label: "Follow-up missed", value: "−91%" },
      { label: "Front-desk admin", value: "−4 hrs/wk" },
    ],
    modules: ["Prospects", "Automation", "Tasks"],
  },
  {
    name: "Riverside Athletic",
    industry: "Full-service club",
    seats: "3,100 members",
    cover: "/media/raw-dashboard.jpg",
    summary: "Attendance data that predicts the cancellation.",
    challenge:
      "Cancellations looked sudden. The attendance record showed members disappearing six weeks earlier.",
    change:
      "Check-ins by member and by day feed a retention view. Any active member with no visit in 14 days lands on a win-back list automatically.",
    metrics: [
      { label: "Churn", value: "−18%" },
      { label: "Win-back calls", value: "+340/yr" },
      { label: "Report build", value: "−9 hrs" },
    ],
    modules: ["Check-ins", "Reports", "Workflows"],
  },
  {
    name: "Vantage Wellness Group",
    industry: "Multi-site brand",
    seats: "11,500 members",
    cover: "/media/raw-office.jpg",
    summary: "Club managers see their club. Owners see the brand.",
    challenge:
      "Regional managers needed cross-club numbers; club managers only needed their own. One shared login gave everyone everything.",
    change:
      "Scoped roles per club, a shared plan catalogue and an audit trail on every price or permission change. Data access matches the org chart.",
    metrics: [
      { label: "Price errors", value: "0" },
      { label: "Onboarding", value: "1 day" },
      { label: "Audit findings", value: "0" },
    ],
    modules: ["Memberships", "Roles", "Audit log"],
  },
  {
    name: "Peak24",
    industry: "24-hour gyms",
    seats: "6,800 members",
    cover: "/media/raw-collab.jpg",
    summary: "Access, billing and support on one member timeline.",
    challenge:
      "A failed card, a broken turnstile and a class-booking bug were three separate tickets with three different owners.",
    change:
      "Support tickets attach to the member and the club. The advisor sees the billing history and the access log before replying.",
    metrics: [
      { label: "First response", value: "−38%" },
      { label: "Repeat tickets", value: "−22%" },
      { label: "Member satisfaction", value: "4.7/5" },
    ],
    modules: ["Support", "Members", "Check-ins"],
  },
  {
    name: "Studio Nine",
    industry: "Boutique studio",
    seats: "320 members",
    cover: "/media/raw-notes.jpg",
    summary: "Small studio, short sales cycle, no admin tax.",
    challenge:
      "Two coaches, one shared inbox and a CRM that took longer to update than the intro offer took to sell.",
    change:
      "Fast prospect capture, keyboard-first contract updates and one board. The weekly review is a five-minute habit.",
    metrics: [
      { label: "Admin per join", value: "−52%" },
      { label: "Response time", value: "1.4 hrs" },
      { label: "Adoption", value: "100%" },
    ],
    modules: ["Prospects", "Memberships", "Plans"],
  },
];

export const product = {
  badge: "The product",
  headline: ["The member platform", "your front desk actually opens."],
  body:
    "Every prospect, member, contract, check-in and ticket on one record set. Create your gym brand, add your clubs, invite staff, and run the first membership pipeline this afternoon. Demo data included.",
  steps: ["Prospects", "Memberships", "Members", "Reports"],
  cta: { label: "Open the live demo", href: "/login" },
  video: "/media/hero-pipeline.mp4",
  poster: "/media/hero-poster.jpg",
  meta: "2 min walkthrough · Demo data included",
};

export const contact = {
  headline: "Let's fill the floor",
  email: brand.email,
  links: [
    { label: "Live demo", href: "/login" },
    { label: "Create gym workspace", href: "/register" },
    { label: "Modules", href: "#services" },
    { label: "Customers", href: "#work" },
    { label: "Sign in", href: "/login" },
  ],
  copyright: "© 2026 GymFlow",
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
