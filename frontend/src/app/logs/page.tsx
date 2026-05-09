"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ClipboardList,
  RefreshCw,
  Loader2,
  AlertCircle,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/breadcrumb";
import { HelpTip } from "@/components/help-tip";
import { api, type SearchLogItem } from "@/lib/api";

export default function LogsPage() {
  const [logs, setLogs] = useState<SearchLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.listLogs();
      setLogs(data.logs);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const confidenceColor = (score: number | null) => {
    if (score === null) return "secondary";
    if (score >= 80) return "default" as const;
    if (score >= 50) return "secondary" as const;
    return "destructive" as const;
  };

  return (
    <div className="flex flex-col h-screen">
      <Breadcrumb />
      <header className="border-b border-border bg-card px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">検索ログ</h2>
              <HelpTip text="すべての検索クエリと回答の履歴が記録されます。監査やナレッジ改善に活用できます" />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              過去の検索履歴を確認できます（{total}件）
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchLogs}>
            <RefreshCw className="w-4 h-4 mr-1.5" />
            更新する
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-auto px-8 py-6">
        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/5 rounded-lg px-4 py-3 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            読み込み中...
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <ClipboardList className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">検索ログがありません</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              ナレッジ検索を使用すると、検索履歴がここに記録されます。
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-w-4xl">
            {logs.map((log) => (
              <Card key={log.id} className="shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <Search className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{log.query}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(log.searched_at)}
                        </p>
                      </div>
                    </div>
                    {log.confidence_score !== null && (
                      <Badge variant={confidenceColor(log.confidence_score)} className="shrink-0">
                        信頼度: {log.confidence_score}%
                      </Badge>
                    )}
                  </div>
                  {log.answer && (
                    <div className="ml-7 bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                        {log.answer}
                      </p>
                    </div>
                  )}
                  {log.source_documents && (
                    <div className="ml-7 flex flex-wrap gap-1.5">
                      {JSON.parse(log.source_documents).map(
                        (src: { name: string; page: number | null }, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {src.name}
                            {src.page ? ` p.${src.page}` : ""}
                          </Badge>
                        )
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
