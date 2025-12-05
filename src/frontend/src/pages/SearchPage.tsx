import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { HomeIcon, LogoMark, SearchIcon } from "../components/Icons";
import ThemeToggle from "../components/ThemeToggle";
import { buildCoverUrl, fetchBooks, fetchBookMeta, searchByImage, searchByText } from "../lib/api";
import type { BookListItem } from "../types";
import "./search.css";

const chunk = <T,>(arr: T[], size: number) => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
};

function SearchPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQuery = params.get("q") ?? "";
  const initialPage = Math.max(parseInt(params.get("page") ?? "1", 10) || 1, 1);

  const [queryInput, setQueryInput] = useState(initialQuery);
  const [page, setPage] = useState(initialPage);
  const [books, setBooks] = useState<BookListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [txtUploadLoading, setTxtUploadLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [txtFileName, setTxtFileName] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const txtInputRef = useRef<HTMLInputElement | null>(null);
  const requestIdRef = useRef(0);
  const pageSize = 10;
  const [pageInput, setPageInput] = useState(String(initialPage));
  const [searchMode, setSearchMode] = useState<"title" | "image" | "text">("title");

  const rows = useMemo(() => chunk(books, 5), [books]);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (queryInput.trim()) next.set("q", queryInput.trim());
    if (page > 1) next.set("page", String(page));
    setParams(next, { replace: true });
    setPageInput(String(page));
  }, [queryInput, page, setParams]);

  useEffect(() => {
    if (searchMode !== "title") return;
    const term = queryInput.trim();
    const currentRequest = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const { items, total: t } = await fetchBooks({ q: term, page, pageSize });
        if (currentRequest !== requestIdRef.current) return;
        setBooks(items);
        setTotal(t);
      } catch (err) {
        if (currentRequest !== requestIdRef.current) return;
        setError("Tidak dapat memuat hasil pencarian");
      } finally {
        if (currentRequest !== requestIdRef.current) return;
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [queryInput, page, pageSize, searchMode]);

  const toPage = (p: number) => {
    const clamped = Math.min(Math.max(1, p), pageCount);
    setPage(clamped);
  };

  const runImageSearch = async (file: File) => {
    setImageLoading(true);
    setError(null);
    setSearchMode("image");
    try {
      const results = await searchByImage(file, 10);
      const mapped: BookListItem[] = results.map((r) => ({
        id: r.id,
        title: r.title,
        cover: r.cover,
      }));
      setBooks(mapped);
      setTotal(mapped.length);
      setPage(1);
      setPageInput("1");
    } catch (err) {
      setError("Gagal mencari dengan gambar");
    } finally {
      setImageLoading(false);
    }
  };

  const onImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      runImageSearch(file);
      e.target.value = "";
    }
  };

  const onTxtSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTxtUploadLoading(true);
    setError(null);
    setSearchMode("text");
    setTxtFileName(file.name);
    const currentRequest = ++requestIdRef.current;
    try {
      const content = await file.text();
      const normalized = content.replace(/\s+/g, " ").trim();
      if (!normalized) {
        throw new Error("Isi file kosong");
      }
      const limit = 8000;
      const queryPayload =
        normalized.length > limit
          ? `${normalized.slice(0, limit / 2)} ${normalized.slice(-limit / 2)}`
          : normalized;
      const topK = 30; // backend allows up to 30
      const raw = await searchByText(queryPayload, topK);
      const hydrated = await Promise.all(
        raw.map(async (item) => {
          try {
            const meta = await fetchBookMeta(item.id);
            return { ...item, ...meta };
          } catch {
            return item;
          }
        })
      );
      hydrated.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      if (currentRequest !== requestIdRef.current) return;
      setBooks(hydrated);
      setTotal(hydrated.length);
      setPage(1);
      setPageInput("1");
      if (txtInputRef.current) txtInputRef.current.value = "";
    } catch (err) {
      if (currentRequest !== requestIdRef.current) return;
      setError("Gagal mencari dengan file teks");
    } finally {
      if (currentRequest === requestIdRef.current) setTxtUploadLoading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="search-page">
      <header className="search-header">
        <Link to="/" className="brand">
          <LogoMark />
        </Link>
        <div className="nav-pills">
          <Link className="pill ghost" to="/">
            <HomeIcon />
            <span>Home</span>
          </Link>
          <Link className="pill active" to="/search">
            <SearchIcon />
            <span>Search</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="search-bar">
        <SearchIcon />
        <input
          value={queryInput}
          onChange={(e) => {
            setQueryInput(e.target.value);
            setPage(1);
            setSearchMode("title");
          }}
          placeholder="Find your titles"
        />
        <div className="search-pagination">
          <div className="image-upload pill ghost">
            <input ref={imageInputRef} type="file" accept="image/*" onChange={onImageSelect} />
            <span>{imageLoading ? "Uploading..." : "Search by Image"}</span>
          </div>
          <div className="text-upload pill ghost">
            <input ref={txtInputRef} type="file" accept=".txt,text/plain" onChange={onTxtSelect} />
            <span>{txtUploadLoading ? "Processing..." : "Search by .txt"}</span>
          </div>
          {txtFileName && (
            <div className="txt-label">
              <span>{txtFileName}</span>
              <button
                className="clear-btn"
                onClick={() => {
                  setTxtFileName(null);
                  setBooks([]);
                  setTotal(0);
                  setTxtUploadLoading(false);
                  setSearchMode("title");
                  setQueryInput("");
                  setPage(1);
                  setPageInput("1");
                  if (txtInputRef.current) txtInputRef.current.value = "";
                }}
              >
                ×
              </button>
            </div>
          )}
          {imagePreview && (
            <div className="image-preview">
              <img src={imagePreview} alt="Selected" />
              <button
                className="clear-btn"
                onClick={() => {
                  setImagePreview(null);
                  setBooks([]);
                  setTotal(0);
                  setSearchMode("title");
                  setQueryInput("");
                  setPage(1);
                  setPageInput("1");
                  if (imageInputRef.current) imageInputRef.current.value = "";
                }}
              >
                ×
              </button>
            </div>
          )}
          <button
            className="pager-btn"
            disabled={page <= 1}
            onClick={() => toPage(page - 1)}
            aria-label="Previous page"
          >
            &lt;
          </button>
          <label className="page-indicator">
            Page
            <input
              type="number"
              min={1}
              max={pageCount}
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const next = parseInt(pageInput || "1", 10);
                  toPage(isNaN(next) ? 1 : next);
                }
              }}
            />
            of {pageCount}
          </label>
          <button
            className="pager-btn"
            disabled={page >= pageCount}
            onClick={() => toPage(page + 1)}
            aria-label="Next page"
          >
            &gt;
          </button>
        </div>
      </div>
      <div className="search-meta">
        <span>{total} results</span>
      </div>

      <div className="search-shelves">
        {loading && <p className="meta">Memuat...</p>}
        {error && <p className="meta error">{error}</p>}
        {!loading && !error && books.length === 0 && <p className="meta">Tidak ada hasil.</p>}
        {rows.map((row, idx) => (
          <div className="search-shelf" key={idx}>
            <div className="shelf-row">
              {row.map((book) => (
                <button
                  key={book.id}
                  className="search-card"
                  onClick={() => navigate(`/read/${book.id}`)}
                  title={book.title}
                >
                  {book.cover ? (
                    <img src={buildCoverUrl(book.cover)} alt={book.title} />
                  ) : (
                    <div className="cover-placeholder search">No Cover</div>
                  )}
                  <div className="card-title">
                    <span>{book.title}</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="shelf-plank" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default SearchPage;
