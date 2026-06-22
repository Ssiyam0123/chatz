"use client";

import React from "react";
import { AuthProvider } from "@/lib/auth";
import ProtectedLayout from "@/components/ProtectedLayout";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ProtectedLayout>{children}</ProtectedLayout>
    </AuthProvider>
  );
}
