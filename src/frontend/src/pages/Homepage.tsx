import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { HomeIcon, LogoMark, SearchIcon } from "../components/Icons";
import ThemeToggle from "../components/ThemeToggle";
import { buildCoverUrl, fetchBooks } from "../lib/api";
import type { BookListItem } from "../types";
import "./homepage.css";

const shuffle = <T,>(list: T[]) => {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const LargeCover = ({
  book,
  delay,
  onSelect,
}: {
  book: BookListItem;
  delay: number;
  onSelect: (id: string | number) => void;
}) => (
  <button
    className="cover-tall"
    style={{ animationDelay: `${delay * 70}ms` }}
    onClick={() => onSelect(book.id)}
  >
    {book.cover ? (
      <img src={buildCoverUrl(book.cover)} alt={book.title} />
    ) : (
      <div className="cover-placeholder large">No Cover</div>
    )}
  </button>
);

const ShelfItem = ({
  book,
  onSelect,
}: {
  book: BookListItem;
  onSelect: (id: string | number) => void;
}) => (
  <button className="shelf-item" onClick={() => onSelect(book.id)} title={book.title}>
    {book.cover ? (
      <img src={buildCoverUrl(book.cover)} alt={book.title} />
    ) : (
      <div className="cover-placeholder small">No Cover</div>
    )}
    <p>{book.title}</p>
  </button>
);

function Homepage() {
  const [books, setBooks] = useState<BookListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const navigate = useNavigate();

  const featured = useMemo(() => books.slice(0, 2), [books]);
  const shelf = useMemo(() => books.slice(2, 8), [books]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { items } = await fetchBooks({ page: 1, pageSize: 50 });
        setBooks(shuffle(items));
      } catch (err) {
        setError("Tidak dapat memuat daftar buku");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    const term = searchText.trim();
    if (term) {
      navigate(`/search?q=${encodeURIComponent(term)}`);
    } else {
      navigate("/search");
    }
  };

  const goToRead = (id: string | number) => {
    navigate(`/read/${id}`);
  };

  const hasShelf = !loading && shelf.length > 0;

  return (
    <div className="homepage">
      <header className="hero-card">
        <div className="hero-top">
          <div className="brand">
            <LogoMark />
          </div>
          <div className="nav-pills">
            <Link className="pill active" to="/">
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

        <div className="hero-body">
          <div className="headline">
            <h1>
              New & <br />
              Trending
            </h1>
            <p>Explore new worlds from authors</p>
            <form className="hero-search" onSubmit={handleSearchSubmit}>
              <SearchIcon />
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Find your titles"
              />
            </form>
          </div>
          <div className="feature-covers">
            {featured.map((book, idx) => (
              <LargeCover key={book.id} book={book} delay={idx} onSelect={goToRead} />
            ))}
          </div>
        </div>
      </header>

      <section className="shelf-wrap">
        <div className="shelf-board" />
        <div className="shelf-body">
          {hasShelf && (
            <>
              <div className="shelf-label">Recommendation</div>
              <div className="shelf-grid">
                {shelf.map((book) => (
                  <ShelfItem key={book.id} book={book} onSelect={goToRead} />
                ))}
              </div>
            </>
          )}
          {loading && <p className="meta">Memuat...</p>}
          {error && <p className="meta error">{error}</p>}
          {!loading && !error && shelf.length === 0 && <p className="meta">Tidak ada buku.</p>}
        </div>
      </section>
    </div>
  );
}

export default Homepage;
