import type { BookDetail, BookListItem } from "../types";

export const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000/api";
export const DATA_BASE = import.meta.env.VITE_DATA_BASE ?? "http://localhost:8000/data";

export const buildCoverUrl = (path?: string) => {
  if (!path) return "";
  const clean = path.startsWith("/") ? path.slice(1) : path;
  return `${DATA_BASE}/${clean}`;
};

type FetchBooksParams = {
  q?: string;
  page?: number;
  pageSize?: number;
};

export async function fetchBooks({
  q = "",
  page = 1,
  pageSize = 20,
}: FetchBooksParams): Promise<{ items: BookListItem[]; total: number }> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  if (q.trim()) params.append("q", q.trim());

  const res = await fetch(`${API_BASE}/books?${params.toString()}`);
  if (!res.ok) {
    throw new Error("Gagal memuat daftar buku");
  }
  const data = await res.json();
  return {
    items: data.items ?? [],
    total: data.total ?? data.items?.length ?? 0,
  };
}

export async function fetchBook(id: string | number): Promise<BookDetail> {
  const normalized = String(id);
  const res = await fetch(`${API_BASE}/books/${normalized}`);
  if (!res.ok) {
    throw new Error("Gagal memuat detail buku");
  }
  const data = await res.json();
  return {
    id: data.id,
    title: data.title,
    cover: data.cover,
    content: data.content ?? "",
    recommendations: data.recommendations ?? [],
  };
}

export type ImageSearchResult = {
  id: string | number;
  title: string;
  cover?: string;
  similarity?: number;
};

export async function searchByText(query: string, topK = 10): Promise<BookListItem[]> {
  const params = new URLSearchParams({
    q: query,
    top_k: String(topK),
  });

  const res = await fetch(`${API_BASE}/search/text?${params.toString()}`);
  if (!res.ok) throw new Error("Gagal mencari dengan teks");
  const data = await res.json();
  return (data || []).map((item: any) => ({
    id: item.id,
    title: item.title,
    score: item.score,
  }));
}

export async function fetchBookMeta(id: string | number): Promise<BookListItem> {
  const normalized = String(id);
  const res = await fetch(`${API_BASE}/books/${normalized}`);
  if (!res.ok) throw new Error("Gagal memuat detail buku");
  const data = await res.json();
  return {
    id: data.id,
    title: data.title,
    cover: data.cover,
  };
}

export async function searchByImage(file: File, topK = 10): Promise<ImageSearchResult[]> {
  const form = new FormData();
  form.append("file", file);
  form.append("top_k", String(topK));

  const res = await fetch(`${API_BASE}/image/retrieve`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error("Gagal mencari dengan gambar");
  const data = await res.json();
  return (data.results || []).map((r: any) => ({
    id: r.book_id,
    title: r.title,
    cover: r.cover,
    similarity: r.similarity,
  }));
}
