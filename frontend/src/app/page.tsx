"use client";

import { useState, useRef, useEffect } from "react";
import { Send, FileText, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/breadcrumb";
import { HelpTip } from "@/components/help-tip";
import { highlightText } from "@/lib/highlight";
import { api, type SearchResponse } from "@/lib/api";
import { useDepartment } from "@/lib/department-context";

interface Message {
  role: "user" | "assistant";
  content: string;
  query?: string;
  sources?: SearchResponse["sources"];
  confidenceScore?: number;
}

function ConfidenceBadge({ score }: { score: number }) {
  const variant = score >= 80 ? "default" : score >= 50 ? "secondary" : "destructive";
  return (
    <span className="inline-flex items-center gap-1">
      <Badge variant={variant}>信頼度: {score}%</Badge>
      <HelpTip text="AIの回答がドキュメントの内容にどれだけ基づいているかを示します" />
    </span>
  );
}

function SourceCard({
  source,
  query,
}: {
  source: SearchResponse["sources"][number];
  query?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className="w-full text-left border border-border rounded-lg p-3 hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-center gap-2 text-sm">
        <FileText className="w-4 h-4 text-primary shrink-0" />
        <span className="font-medium truncate">{source.document_name}</span>
        {source.page && (
          <span className="text-muted-foreground text-xs">p.{source.page}</span>
        )}
        <Badge variant="outline" className="ml-auto text-xs shrink-0">
          {Math.round(source.relevance_score * 100)}%
        </Badge>
      </div>
      {expanded && (
        <p className="mt-2 text-xs text-muted-foreground leading-relaxed border-t border-border pt-2">
          {query ? highlightText(source.content, query) : source.content}
        </p>
      )}
    </button>
  );
}

export default function SearchPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const { department } = useDepartment();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSubmit = async () => {
    const query = input.trim();
    if (!query || loading) return;

    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: query }]);
    setLoading(true);

    try {
      const result = await api.search(query, conversationId, department);
      setConversationId(result.conversation_id);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result.answer,
          query,
          sources: result.sources,
          confidenceScore: result.confidence_score,
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <Breadcrumb />
      <header className="border-b border-border bg-card px-8 py-4">
        <h2 className="text-lg font-semibold">ナレッジ検索</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          社内ドキュメントから必要な情報を検索できます
        </p>
      </header>

      <ScrollArea className="flex-1 px-8" ref={scrollRef}>
        <div className="max-w-3xl mx-auto py-8 space-y-6">
          {messages.length === 0 && !loading && (
            <div className="text-center py-24">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-2">
                社内ナレッジを検索する
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                質問を入力すると、社内ドキュメントから関連情報を検索し、
                AIが出典付きで回答します。
              </p>
              <div className="mt-8 flex flex-wrap gap-2 justify-center">
                {[
                  "有給休暇の申請方法を教えてください",
                  "セキュリティポリシーについて",
                  "新入社員の研修スケジュール",
                ].map((example) => (
                  <button
                    key={example}
                    onClick={() => setInput(example)}
                    className="text-xs px-4 py-2 rounded-full border border-border hover:bg-accent transition-colors text-muted-foreground"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i}>
              {msg.role === "user" ? (
                <div className="flex justify-end">
                  <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-5 py-3 max-w-lg">
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ) : (
                <Card className="border-border shadow-sm">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        AI回答
                      </Badge>
                      {msg.confidenceScore !== undefined && (
                        <ConfidenceBadge score={msg.confidenceScore} />
                      )}
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                    {msg.sources && msg.sources.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2 inline-flex items-center gap-1.5">
                            出典
                            <HelpTip text="クリックすると、回答の根拠となった原文を確認できます" />
                          </p>
                          <div className="space-y-2">
                            {msg.sources.map((source, j) => (
                              <SourceCard key={j} source={source} query={msg.query} />
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          ))}

          {loading && (
            <Card className="border-border shadow-sm">
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          )}

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/5 rounded-lg px-4 py-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t border-border bg-card px-8 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="質問を入力してください..."
                className="min-h-[48px] max-h-[120px] resize-none text-sm pr-8"
                rows={1}
              />
              <span className="absolute right-2 top-2">
                <HelpTip text="自然言語で質問を入力してください。複数の文書から関連情報を検索します" />
              </span>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!input.trim() || loading}
              size="icon"
              className="shrink-0 h-12 w-12"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Shift + Enter で改行 ・ Enter で送信
          </p>
        </div>
      </div>
    </div>
  );
}
