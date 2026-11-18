"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import {
  LayoutDashboard, UserPlus, Users, MapPin, KanbanSquare, TicketCheck,
  CheckSquare, BarChart3, Workflow, Settings, Bell, CreditCard, LogOut, Search, Menu, X,
  Dumbbell, ClipboardList, QrCode,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/prospects", label: "Prospects", icon: UserPlus },
  { href: "/members", label: "Members", icon: Users },
  { href: "/memberships", label: "Memberships", icon: KanbanSquare },
  { href: "/plans", label: "Plans", icon: ClipboardList },
  { href: "/checkins", label: "Check-ins", icon: QrCode },
  { href: "/locations", label: "Clubs", icon: MapPin },
  { href: "/tickets", label: "Support", icon: TicketCheck },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/workflows", label: "Automations", icon: Workflow },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  /** Clear the session, then leave the app shell so Back cannot reopen it. */
  const signOut = async () => {
    await logout();
    router.replace("/login");
    router.refresh();
  };

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-ink-950 text-slate-400">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-accent-400" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {sidebarOpen && <button className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close menu" />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-ink-950 text-slate-300 transition-transform lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-16 items-center gap-2 border-b border-white/10 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-600 text-white"><Dumbbell size={18} /></div>
          <div>
            <p className="text-sm font-bold text-white">GymFlow</p>
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Member CRM</p>
          </div>
          <button className="ml-auto rounded p-1 text-slate-500 hover:text-white lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active ? "bg-accent-600/90 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                }`}
              >
                <Icon size={17} strokeWidth={2} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-3">
          <Link href="/settings" className="mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-slate-100">
            <Settings size={17} /> Settings
          </Link>
          <Link href="/subscriptions" className="mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-slate-100">
            <CreditCard size={17} /> Subscription
          </Link>
          <button onClick={() => void signOut()} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-rose-300 hover:bg-rose-500/10">
            <LogOut size={17} /> Sign out
          </button>
        </div>
      </aside>
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:px-6">
          <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <div className="relative hidden w-96 md:block">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input !pl-9"
              placeholder="Search members…"
              aria-label="Search members"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                const query = search.trim();
                // Same-route pushes keep the page mounted, so tell it directly.
                window.dispatchEvent(new CustomEvent("gym:search", { detail: query }));
                router.push(query ? `/members?search=${encodeURIComponent(query)}` : "/members");
              }}
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/notifications" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Notifications">
              <Bell size={19} />
            </Link>
            <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-100 text-xs font-bold text-accent-700">
                {user.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-slate-800">{user.name}</p>
                <p className="text-[10px] text-slate-500">{user.email}</p>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
