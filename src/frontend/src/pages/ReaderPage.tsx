import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BackIcon, BookIcon, LogoMark, HomeIcon, SearchIcon } from "../components/Icons";
import ThemeToggle from "../components/ThemeToggle";
import { buildCoverUrl, fetchBook, fetchBooks } from "../lib/api";
import type { BookDetail, BookListItem } from "../types";
import "./reader.css";

function ReaderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState<BookDetail | null>(null);
  const [recommended, setRecommended] = useState<BookListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewText = useMemo(() => {
    const content = book?.content ?? "";
    if (!content) return "";
    const paragraphs = content
      .split(/\r?\n\s*\r?\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    const joined = paragraphs.slice(0, 4).join("\n\n");
    return joined || content.slice(0, 800);
  }, [book]);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const detail = await fetchBook(id);
        setBook(detail);
        const recIds = detail.recommendations?.map((r) => r.id) ?? [];
        const recDetails: Array<BookListItem | null> = await Promise.all(
          recIds.map(async (rid) => {
            try {
              const meta = await fetchBook(rid);
              return { id: meta.id, title: meta.title, cover: meta.cover };
            } catch {
              return null;
            }
          }),
        );
        const withCover: BookListItem[] = recDetails.filter((b): b is BookListItem => Boolean(b));
        let finalList: BookListItem[] = withCover.slice(0, 6);
        if (finalList.length < 6) {
          const { items } = await fetchBooks({ page: 1, pageSize: 8 });
          const fallback = items.filter((b) => String(b.id) !== String(id)).slice(0, 6);
          finalList = [...finalList, ...fallback].slice(0, 6);
        }
        setRecommended(finalList);
      } catch (err) {
        setError("Tidak dapat memuat detail buku");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const goRead = (targetId: string | number) => navigate(`/read/${targetId}`);

  const openBook = () => navigate(`/book/${id}`);

  return (
    <div className="reader-page">
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
        <>
          <section className="reader-hero">
            <div className="reader-main">
              <div className="reader-cover">
                {book.cover ? (
                  <img src={buildCoverUrl(book.cover)} alt={book.title} />
                ) : (
                  <div className="cover-placeholder large">No Cover</div>
                )}
              </div>
              <div className="reader-content">
                <h1>{book.title}</h1>
                <button className="read-btn" onClick={openBook}>
                  <BookIcon />
                  <span>Read Now</span>
                </button>
              </div>
            </div>
            <div className="reader-preview">
              <div className="preview-panel" id="preview">
                {previewText ? (
                  <p className="preview-text">{previewText}</p>
                ) : (
                  <p>Tidak ada konten untuk pratinjau.</p>
                )}
              </div>
            </div>
          </section>
          <div className="hero-shelf" />
        </>
      )}

      <section className="recommend">
        <h2>Recommended Books</h2>
        <div className="recommend-grid">
          {recommended.map((item) => (
            <button key={item.id} className="recommend-card" onClick={() => goRead(item.id)}>
              {item.cover ? (
                <img src={buildCoverUrl(item.cover)} alt={item.title} />
              ) : (
                <div className="cover-placeholder small">No Cover</div>
              )}
              <span>{item.title}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export default ReaderPage;
