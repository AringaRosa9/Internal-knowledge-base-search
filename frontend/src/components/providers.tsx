"use client";

import { DepartmentProvider } from "@/lib/department-context";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return <DepartmentProvider>{children}</DepartmentProvider>;
}
