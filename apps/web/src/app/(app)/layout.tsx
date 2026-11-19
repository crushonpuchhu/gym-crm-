"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  Chip,
  ListItemText,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { Stack } from "@/components/mui-stack";
import {
  BarChart3,
  Bell,
  CheckSquare,
  ClipboardList,
  Dumbbell,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  QrCode,
  Search,
  Settings,
  ShieldCheck,
  TicketCheck,
  UserPlus,
  Users,
  Workflow,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { roleLabel } from "@/lib/roles";
import { ColorModeProvider, ColorModeToggle } from "@/components/color-mode";

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

const FOOTER_NAV = [
  { href: "/users", label: "Staff & access", icon: ShieldCheck },
  { href: "/subscriptions", label: "Subscription", icon: ClipboardList },
  { href: "/settings", label: "Settings", icon: Settings },
];

function Brand() {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: 1, py: 0.5 }}>
      <Box
        sx={{
          display: "grid",
          placeItems: "center",
          width: 40,
          height: 40,
          borderRadius: 2.5,
          border: "1px solid rgba(75,124,242,0.45)",
          background: "linear-gradient(160deg, var(--gf-accent), var(--gf-chart-bar-bottom))",
          color: "#ffffff",
          boxShadow: "0 6px 18px rgba(75,124,242,0.28)",
        }}
      >
        <Dumbbell size={18} strokeWidth={2.1} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography sx={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.01em" }}>GymFlow</Typography>
        </Stack>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Member CRM
        </Typography>
      </Box>
    </Stack>
  );
}

function SidebarContent({
  pathname,
  onNavigate,
  onSignOut,
  userName,
  userEmail,
  search,
  onSearch,
  onSearchSubmit,
}: {
  pathname: string;
  onNavigate: () => void;
  onSignOut: () => void;
  userName: string;
  userEmail: string;
  search: string;
  onSearch: (value: string) => void;
  onSearchSubmit: () => void;
}) {
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Stack sx={{ height: "100%", py: 2 }} spacing={1}>
      <Brand />
      <Box sx={{ px: 2, pt: 1.5 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search anything…"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSearchSubmit();
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={15} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Box
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1,
                      px: 0.75,
                      py: 0.25,
                      fontSize: 10,
                      color: "text.secondary",
                      lineHeight: 1.2,
                    }}
                  >
                    ⏎
                  </Box>
                </InputAdornment>
              ),
            },
          }}
          sx={{ "& .MuiOutlinedInput-root": { backgroundColor: "background.default" } }}
        />
      </Box>
      <List sx={{ px: 1.5, pt: 1, flex: 1, overflowY: "auto" }}>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <ListItemButton
              key={href}
              component={Link}
              href={href}
              selected={active}
              onClick={onNavigate}
              sx={{
                mb: 0.5,
                border: active ? "1px solid var(--gf-accent-border)" : "1px solid transparent",
              }}
            >
              <ListItemIcon>
                <Icon size={17} strokeWidth={1.9} />
              </ListItemIcon>
              <ListItemText primary={label} />
            </ListItemButton>
          );
        })}
      </List>
      <Divider sx={{ mx: 2 }} />
      <List sx={{ px: 1.5 }}>
        {FOOTER_NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <ListItemButton
              key={href}
              component={Link}
              href={href}
              selected={active}
              onClick={onNavigate}
              sx={{
                mb: 0.5,
                border: active ? "1px solid var(--gf-accent-border)" : "1px solid transparent",
              }}
            >
              <ListItemIcon>
                <Icon size={17} strokeWidth={1.9} />
              </ListItemIcon>
              <ListItemText primary={label} />
            </ListItemButton>
          );
        })}
        <ListItemButton onClick={onSignOut} sx={{ color: "text.secondary" }}>
          <ListItemIcon sx={{ color: "inherit" }}>
            <LogOut size={17} strokeWidth={1.9} />
          </ListItemIcon>
          <ListItemText primary="Sign out" />
        </ListItemButton>
      </List>
      <Box sx={{ px: 1.5, pt: 1.5 }}>
        <Stack
          direction="row"
          spacing={1.25}
          alignItems="center"
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 3,
            p: 1.25,
            backgroundColor: "action.hover",
          }}
        >
          <Avatar sx={{ width: 32, height: 32, fontSize: 12 }}>
            {userName.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap sx={{ fontSize: 12.5, fontWeight: 600 }}>
              {userName}
            </Typography>
            <Typography noWrap variant="caption" sx={{ color: "text.secondary" }}>
              {userEmail}
            </Typography>
          </Box>
        </Stack>
      </Box>
    </Stack>
  );
}

function AppLayoutInner({ children }: { children: ReactNode }) {
  const { user, loading, logout, memberships, organizationId, role, switchOrg } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const isDesktop = useMediaQuery("(min-width:1200px)", { noSsr: true });

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  /** Clear the session, then leave the app shell so Back cannot reopen it. */
  const signOut = async () => {
    await logout();
    router.replace("/login");
    router.refresh();
  };

  const current = [
    ...NAV,
    ...FOOTER_NAV,
    { href: "/notifications", label: "Notifications", icon: Bell },
    { href: "/users", label: "Users & roles", icon: Users },
  ].find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  if (loading || !user) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
          <Box
            sx={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              border: "2px solid var(--gf-border)",
              borderTopColor: "var(--gf-accent)",
              animation: "spin 0.8s linear infinite",
              "@keyframes spin": { to: { transform: "rotate(360deg)" } },
            }}
          />
        </Box>
    );
  }

  const sidebar = (
    <SidebarContent
      pathname={pathname}
      onNavigate={() => setSidebarOpen(false)}
      onSignOut={() => void signOut()}
      userName={user.name}
      userEmail={user.email}
      search={search}
      onSearch={setSearch}
      onSearchSubmit={() => {
        const query = search.trim();
        // Same-route pushes keep the page mounted, so tell it directly too.
        window.dispatchEvent(new CustomEvent("gym:search", { detail: query }));
        router.push(query ? `/members?search=${encodeURIComponent(query)}` : "/members");
        setSidebarOpen(false);
      }}
    />
  );

  return (
      <Box sx={{ minHeight: "100vh", display: "flex" }}>
        {isDesktop ? (
          <Box
            component="aside"
            sx={{
              width: 264,
              flexShrink: 0,
              position: "sticky",
              top: 0,
              height: "100vh",
              borderRight: "1px solid",
              borderColor: "divider",
              backgroundColor: "var(--gf-rail)",
              backdropFilter: "blur(14px)",
            }}
          >
            {sidebar}
          </Box>
        ) : (
          <Drawer open={sidebarOpen} onClose={() => setSidebarOpen(false)}>
            <Box sx={{ width: 272, position: "relative" }}>
              <IconButton
                aria-label="Close menu"
                onClick={() => setSidebarOpen(false)}
                sx={{ position: "absolute", right: 8, top: 10, zIndex: 1 }}
              >
                <X size={18} />
              </IconButton>
              {sidebar}
            </Box>
          </Drawer>
        )}

        <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <Box
            component="header"
            sx={{
              position: "sticky",
              top: 0,
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              height: 68,
              px: { xs: 2, lg: 3.5 },
              borderBottom: "1px solid",
              borderColor: "divider",
              backgroundColor: "var(--gf-header)",
              backdropFilter: "blur(14px)",
            }}
          >
            {!isDesktop ? (
              <IconButton aria-label="Open menu" onClick={() => setSidebarOpen(true)}>
                <Menu size={20} />
              </IconButton>
            ) : null}
            <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                GymFlow
              </Typography>
              <Typography variant="body2" sx={{ color: "text.disabled" }}>
                /
              </Typography>
              <Typography noWrap variant="body2" sx={{ fontWeight: 600 }}>
                {current?.label ?? "Workspace"}
              </Typography>
            </Stack>

            {memberships.length > 0 ? (
              <Box sx={{ ml: 2, display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                {memberships.length > 1 ? (
                  <TextField
                    select
                    size="small"
                    value={organizationId ?? ""}
                    onChange={(event) => {
                      const next = event.target.value;
                      void switchOrg(next).then(() => window.location.reload());
                    }}
                    slotProps={{ htmlInput: { "aria-label": "Switch gym brand" } }}
                    sx={{
                      minWidth: 190,
                      "& .MuiOutlinedInput-root": { height: 32, fontSize: 12.5, backgroundColor: "transparent" },
                    }}
                  >
                    {memberships.map((membership) => (
                      <MenuItem key={membership.organization.id} value={membership.organization.id}>
                        {membership.organization.name}
                      </MenuItem>
                    ))}
                  </TextField>
                ) : (
                  <Typography noWrap variant="caption" sx={{ color: "text.secondary", display: { xs: "none", md: "block" } }}>
                    {memberships[0].organization.name}
                  </Typography>
                )}
                {role ? (
                  <Chip
                    label={roleLabel(role)}
                    size="small"
                    sx={{ display: { xs: "none", lg: "inline-flex" }, textTransform: "none", letterSpacing: 0 }}
                  />
                ) : null}
              </Box>
            ) : null}

            <Stack direction="row" alignItems="center" spacing={1} sx={{ ml: "auto" }}>
              <ColorModeToggle />
              <Tooltip title="Notifications">
                <IconButton component={Link} href="/notifications" aria-label="Notifications">
                  <Bell size={18} />
                </IconButton>
              </Tooltip>
              <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
              <Stack direction="row" spacing={1.25} alignItems="center">
                <Avatar sx={{ width: 32, height: 32, fontSize: 11.5 }}>
                  {user.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}
                </Avatar>
                <Box sx={{ display: { xs: "none", sm: "block" } }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.2 }}>{user.name}</Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {user.email}
                  </Typography>
                </Box>
              </Stack>
            </Stack>
          </Box>

          <Box
            component="main"
            sx={{ flex: 1, minWidth: 0, px: { xs: 2, lg: 3.5 }, py: { xs: 2.5, lg: 3.5 } }}
          >
            <Box sx={{ maxWidth: 1360, mx: "auto", width: "100%" }}>{children}</Box>
          </Box>
        </Box>
      </Box>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <ColorModeProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </ColorModeProvider>
  );
}
