const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "エラーが発生しました" }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface SourceChunk {
  document_name: string;
  page: number | null;
  content: string;
  relevance_score: number;
}

export interface SearchResponse {
  answer: string;
  confidence_score: number;
  sources: SourceChunk[];
  conversation_id: string;
}

export interface DocumentItem {
  id: number;
  filename: string;
  file_type: string;
  category: string;
  department: string;
  status: string;
  chunk_count: number;
  created_at: string;
}

export interface SearchLogItem {
  id: number;
  query: string;
  answer: string | null;
  source_documents: string | null;
  confidence_score: number | null;
  searched_at: string;
}

export const api = {
  search(query: string, conversationId?: string, department?: string) {
    return fetchAPI<SearchResponse>("/search", {
      method: "POST",
      body: JSON.stringify({
        query,
        conversation_id: conversationId,
        department,
      }),
    });
  },

  uploadDocument(file: File, department: string = "全社共通") {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("department", department);
    return fetch(`${API_BASE}/documents`, { method: "POST", body: formData }).then(
      async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: "アップロードに失敗しました" }));
          throw new Error(err.detail);
        }
        return res.json() as Promise<DocumentItem>;
      }
    );
  },

  listDocuments(skip = 0, limit = 20, department?: string) {
    const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
    if (department) params.set("department", department);
    return fetchAPI<{ documents: DocumentItem[]; total: number }>(
      `/documents?${params}`
    );
  },

  deleteDocument(id: number) {
    return fetchAPI<void>(`/documents/${id}`, { method: "DELETE" });
  },

  listLogs(skip = 0, limit = 50) {
    return fetchAPI<{ logs: SearchLogItem[]; total: number }>(
      `/logs?skip=${skip}&limit=${limit}`
    );
  },
};
