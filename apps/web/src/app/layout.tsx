import "./globals.css";
import type { Metadata } from "next";
import { ReactNode } from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v14-appRouter";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "GymFlow — Member CRM for gym brands",
  description: "Multi-tenant gym CRM for prospects, members, membership plans, check-ins, support and retention reporting.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=DM+Serif+Display:ital@0;1&family=Geist:wght@300;400;500&family=Geist+Mono:wght@400;500&display=swap"
        />
      </head>
      <body>
        {/* Emotion cache for the app surfaces; the landing page keeps its own CSS. */}
        <AppRouterCacheProvider options={{ key: "mui" }}>
          <AuthProvider>{children}</AuthProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
