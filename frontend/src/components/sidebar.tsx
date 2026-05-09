"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, FileText, ClipboardList, Database, Building2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDepartment, DEPARTMENTS } from "@/lib/department-context";
import { HelpTip } from "@/components/help-tip";

const navItems = [
  { href: "/", label: "検索する", icon: Search },
  { href: "/documents", label: "ドキュメント管理", icon: FileText },
  { href: "/logs", label: "検索ログ", icon: ClipboardList },
];

export function Sidebar() {
  const pathname = usePathname();
  const { department, setDepartment } = useDepartment();

  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col min-h-screen">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Database className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-tight">
              社内ナレッジ検索
            </h1>
            <p className="text-xs text-muted-foreground">Knowledge Base</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border space-y-3">
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">部署切替</span>
            <HelpTip text="所属部署を選択すると、閲覧可能なドキュメントが切り替わります" />
          </div>
          <div className="relative">
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value as typeof department)}
              className="w-full appearance-none bg-background border border-border rounded-lg px-3 py-2 text-sm pr-8 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Powered by Claude AI + RAG
        </p>
      </div>
    </aside>
  );
}
