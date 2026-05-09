"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Upload,
  FileText,
  Trash2,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Breadcrumb } from "@/components/breadcrumb";
import { HelpTip } from "@/components/help-tip";
import { api, type DocumentItem } from "@/lib/api";
import { useDepartment } from "@/lib/department-context";

const statusConfig: Record<string, { icon: typeof CheckCircle2; className: string }> = {
  "完了": { icon: CheckCircle2, className: "text-green-600 bg-green-50" },
  "処理中": { icon: Clock, className: "text-amber-600 bg-amber-50" },
  "エラー": { icon: XCircle, className: "text-red-600 bg-red-50" },
};

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig["処理中"];
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={config.className}>
      <Icon className="w-3 h-3 mr-1" />
      {status}
    </Badge>
  );
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { department } = useDepartment();

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.listDocuments(0, 20, department);
      setDocuments(data.documents);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [department]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      for (const file of Array.from(files)) {
        await api.uploadDocument(file, department);
      }
      await fetchDocuments();
    } catch (e) {
      setError(e instanceof Error ? e.message : "アップロードに失敗しました");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteDocument(deleteTarget.id);
      setDeleteTarget(null);
      await fetchDocuments();
    } catch (e) {
      setError(e instanceof Error ? e.message : "削除に失敗しました");
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex flex-col h-screen">
      <Breadcrumb />
      <header className="border-b border-border bg-card px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">ドキュメント管理</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              ナレッジベースのドキュメントを管理します（{total}件）
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <Button variant="outline" size="sm" onClick={fetchDocuments}>
              <RefreshCw className="w-4 h-4 mr-1.5" />
              更新する
            </Button>
            <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-1.5" />
              )}
              アップロードする
            </Button>
            <HelpTip text="対応形式: PDF, Word (.docx), テキスト, Markdown。最大50MB" />
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.txt,.md"
              multiple
              onChange={handleUpload}
              className="hidden"
            />
          </div>
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
        ) : documents.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">
              ドキュメントがありません
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              PDF、Word、テキスト、Markdownファイルをアップロードして、
              ナレッジベースを構築しましょう。
            </p>
            <Button
              className="mt-6"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-1.5" />
              最初のドキュメントをアップロードする
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {documents.map((doc) => (
              <Card key={doc.id} className="shadow-sm hover:shadow transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {doc.filename}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground uppercase">
                          {doc.file_type}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {doc.chunk_count} チャンク
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(doc.created_at)}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {doc.department}
                    </Badge>
                    <Badge variant="secondary" className="shrink-0">
                      {doc.category}
                    </Badge>
                    <StatusBadge status={doc.status} />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteTarget(doc)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ドキュメントの削除</DialogTitle>
            <DialogDescription>
              「{deleteTarget?.filename}」を削除してもよろしいですか？
              この操作は取り消すことができません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              削除する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
