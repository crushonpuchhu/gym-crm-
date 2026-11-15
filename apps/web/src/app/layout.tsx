import "./globals.css";
import type { Metadata } from "next";
import { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "SalesFlow CRM",
  description: "Customer relationship and sales management platform",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
