import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BackIcon, HomeIcon, LogoMark, SearchIcon } from "../components/Icons";
import { buildCoverUrl, fetchBook } from "../lib/api";
import type { BookDetail } from "../types";
import ThemeToggle from "../components/ThemeToggle";
import "./book.css";

const CHARS_PER_PAGE = 2200;

function paginateContent(raw: string, limit = CHARS_PER_PAGE) {
  const content = raw.replace(/\r\n/g, "\n");
  const pages: string[] = [];
  let pos = 0;

  while (pos < content.length) {
    const tentativeEnd = Math.min(pos + limit, content.length);
    let end = tentativeEnd;

    if (tentativeEnd < content.length) {
      const lastSpace = content.lastIndexOf(" ", tentativeEnd);
      const lastNewline = content.lastIndexOf("\n", tentativeEnd);
      const breakPoint = Math.max(lastSpace, lastNewline);
      if (breakPoint > pos + limit * 0.5) {
        end = breakPoint;
      }
    }

    if (end <= pos) {
      end = Math.min(pos + limit, content.length);
    }

    pages.push(content.slice(pos, end).trim());
    pos = end;
  }

  return pages.length ? pages : ["Tidak ada konten tersedia."];
}

function extractTitleAndBody(content: string) {
  const normalized = content.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const idx = lines.findIndex((line) => line.includes("***"));
  if (idx >= 0) {
    const titleLine = lines[idx].trim();
    const rest = [...lines.slice(0, idx), ...lines.slice(idx + 1)].join("\n").trim();
    return { title: titleLine || null, body: rest };
  }
  const firstNonEmpty = lines.find((l) => l.trim().length > 0) || null;
  const body = lines.join("\n").trim();
  return { title: firstNonEmpty, body };
}

function BookPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spread, setSpread] = useState(1);
  const [pageInput, setPageInput] = useState("1");

  const pages = useMemo(() => {
    const content = book?.content ?? "";
    const { title, body } = extractTitleAndBody(content);
    const bodyPages = paginateContent(body, CHARS_PER_PAGE);
    return title ? [title, ...bodyPages] : bodyPages;
  }, [book]);

  const spreadCount = Math.max(1, Math.ceil(pages.length / 2));
  const currentSpread = Math.min(spread, spreadCount);
  const leftIndex = (currentSpread - 1) * 2;
  const leftPage = pages[leftIndex] ?? "";
  const rightPage = pages[leftIndex + 1] ?? "";
  const leftIsTitle = leftIndex === 0;
  const rightIsTitle = leftIndex + 1 === 0;

  useEffect(() => {
    setPageInput(String(currentSpread));
  }, [currentSpread]);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const detail = await fetchBook(id);
        setBook(detail);
        setSpread(1);
      } catch (err) {
        setError("Tidak dapat memuat buku");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const goSpread = (n: number) => {
    const safe = Math.min(Math.max(1, n), spreadCount || 1);
    setSpread(safe);
  };

  return (
    <div className="book-page">
      <header className="reader-top">
        <button className="circle-btn" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <div className="reader-nav">
          <Link to="/" className="brand">
            <LogoMark />
          </Link>
          <div className="nav-pills">
            <Link className="pill ghost" to="/">
              <HomeIcon />
              <span>Home</span>
            </Link>
            <Link className="pill ghost" to="/search">
              <SearchIcon />
              <span>Search</span>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {loading && <p className="meta">Memuat...</p>}
      {error && <p className="meta error">{error}</p>}

      {book && (
        <section className="book-viewer">
          <div className="book-layout">
            <div className="book-meta">
              {book.cover && <img src={buildCoverUrl(book.cover)} alt={book.title} />}
              <div>
                <h1>{book.title}</h1>
              </div>
            </div>
            <div className="book-canvas">
              <div className="book-sheet">
                <div className={`page-pane ${leftIsTitle ? "title-page" : ""}`}>
                  <p>{leftPage}</p>
                </div>
                <div className={`page-pane ${rightIsTitle ? "title-page" : ""}`}>
                  <p>{rightPage}</p>
                </div>
              </div>
              <div className="book-footer">
                <button
                  className="pager-btn"
                  disabled={currentSpread <= 1}
                  onClick={() => goSpread(currentSpread - 1)}
                  aria-label="Previous page"
                >
                  &lt;
                </button>
                <label className="page-indicator">
                  Page
                  <input
                    type="number"
                    min={1}
                    max={spreadCount}
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const next = parseInt(pageInput || "1", 10);
                        goSpread(isNaN(next) ? 1 : next);
                      }
                    }}
                  />
                  of {spreadCount}
                </label>
                <button
                  className="pager-btn"
                  disabled={currentSpread >= spreadCount}
                  onClick={() => goSpread(currentSpread + 1)}
                  aria-label="Next page"
                >
                  &gt;
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default BookPage;
