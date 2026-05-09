"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

const DEPARTMENTS = ["全社共通", "営業部", "技術部", "人事部", "経理部", "総務部"] as const;
export type Department = (typeof DEPARTMENTS)[number];
export { DEPARTMENTS };

interface DepartmentContextValue {
  department: Department;
  setDepartment: (d: Department) => void;
}

const DepartmentContext = createContext<DepartmentContextValue>({
  department: "技術部",
  setDepartment: () => {},
});

export function DepartmentProvider({ children }: { children: ReactNode }) {
  const [department, setDepartment] = useState<Department>("技術部");
  return (
    <DepartmentContext.Provider value={{ department, setDepartment }}>
      {children}
    </DepartmentContext.Provider>
  );
}

export function useDepartment() {
  return useContext(DepartmentContext);
}
