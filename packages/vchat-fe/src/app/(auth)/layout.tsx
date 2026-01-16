"use client";

/**
 * Auth Layout
 * Layout for authentication pages (login, register, etc.)
 * Redirects to dashboard if already logged in
 */

import { GuestGuard } from "@/shared/components/auth-guard";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GuestGuard>
      <div className="min-h-screen bg-background">{children}</div>
    </GuestGuard>
  );
}
