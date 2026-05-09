"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

const routeLabels: Record<string, string> = {
  "/": "ナレッジ検索",
  "/documents": "ドキュメント管理",
  "/logs": "検索ログ",
};

export function Breadcrumb() {
  const pathname = usePathname();
  const label = routeLabels[pathname] || "ページ";

  return (
    <nav className="flex items-center gap-1.5 text-xs text-muted-foreground px-8 pt-4 pb-0">
      <Link
        href="/"
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <Home className="w-3.5 h-3.5" />
        ホーム
      </Link>
      <ChevronRight className="w-3 h-3" />
      <span className="text-foreground font-medium">{label}</span>
    </nav>
  );
}
