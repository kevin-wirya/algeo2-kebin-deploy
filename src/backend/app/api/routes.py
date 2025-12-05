from __future__ import annotations

import json
from functools import lru_cache
from io import BytesIO
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from PIL import Image

from app.core import lsa
from app.core.image_processing import matrix_to_vector, rgb_to_grayscale
from app.core.linalg import normalize_data
from app.core.pca import compute_coefficients, get_principal_basis, retrieve_similar_images

router = APIRouter()

# Lokasi data
ROOT_DIR = Path(__file__).resolve().parents[4]
DATA_DIR = ROOT_DIR / "data"
MAPPER_PATH = DATA_DIR / "mapper.json"
COVERS_DIR = DATA_DIR / "covers"

# Konfigurasi
KOMPONEN_PCA = 50
KOMPONEN_LSA = 80
MAKS_VOKAB = 8000


@lru_cache(maxsize=1)
def load_mapper() -> Dict[str, Dict]:
    if not MAPPER_PATH.exists():
        raise FileNotFoundError("mapper.json tidak ditemukan")
    return json.loads(MAPPER_PATH.read_text(encoding="utf-8"))


@lru_cache(maxsize=4096)
def read_content(book_id: str) -> str:
    mapper = load_mapper()
    meta = mapper.get(str(book_id))
    if not meta:
        raise FileNotFoundError(f"Buku {book_id} tidak ditemukan di mapper")
    path = DATA_DIR / meta["txt"]
    return path.read_text(encoding="utf-8", errors="ignore")


@lru_cache(maxsize=4096)
def read_snippet(book_id: str, length: int = 300) -> str:
    content = read_content(book_id)
    return content.replace("\n", " ")[:length]


def filter_books(q: str | None) -> List[Dict]:
    mapper = load_mapper()
    books = []
    term = q.lower() if q else None
    for raw_id, meta in mapper.items():
        title = meta.get("title", "").strip()
        if term and term not in title.lower():
            continue
        books.append(
            {
                "id": raw_id,
                "title": title,
                "cover": meta.get("cover", ""),
                "txt": meta.get("txt", ""),
            }
        )
    books.sort(key=lambda b: int(b["id"]))
    return books


# ---------- LSA ----------
class LSAState:
    def __init__(
        self,
        Uk: np.ndarray,
        Sk: np.ndarray,
        embeddings_norm: np.ndarray,
        vocab: List[str],
        idf: np.ndarray,
        term_index: Dict[str, int],
        book_index: Dict[int, int],
        books: List[Dict],
    ):
        self.Uk = Uk
        self.Sk = Sk
        self.embeddings_norm = embeddings_norm
        self.vocab = vocab
        self.idf = idf
        self.term_index = term_index
        self.book_index = book_index
        self.books = books


@lru_cache(maxsize=1)
def build_lsa() -> LSAState:
    mapper = load_mapper()
    freqs: List[Dict[str, int]] = []
    books: List[Dict] = []
    for raw_id, meta in mapper.items():
        try:
            book_id = int(raw_id)
        except ValueError:
            continue
        txt_path = DATA_DIR / meta["txt"]
        if not txt_path.exists():
            continue
        content = txt_path.read_text(encoding="utf-8", errors="ignore")
        tokens = [w for w in lsa.extractTokens(content) if len(w) > 2 and w not in lsa.STOPWORDS]
        freqs.append(lsa.countFreq(tokens))
        books.append(
            {
                "id": book_id,
                "title": meta.get("title", "").strip(),
                "cover": meta.get("cover", ""),
                "txt": meta.get("txt", ""),
                "content": content,
            }
        )

    vocab_full = lsa.buildVocabulary(freqs)
    vocab = vocab_full if len(vocab_full) <= MAKS_VOKAB else vocab_full[:MAKS_VOKAB]
    term_doc = lsa.makeTDmatrix(vocab, freqs)
    tfidf = lsa.compute_tfidf(term_doc.tolist())
    k = max(1, min(KOMPONEN_LSA, tfidf.shape[0], tfidf.shape[1]))
    Uk, Sk, Vk = lsa.truncatedSVD(tfidf, k)
    embeddings = lsa.computeDocumentEmbeddings(Vk, Sk)
    embeddings_norm = lsa.normalizeDocuments(embeddings)
    idf_vector = lsa.compute_idf(term_doc.tolist())
    term_index = {term: idx for idx, term in enumerate(vocab)}
    book_index = {book["id"]: idx for idx, book in enumerate(books)}
    return LSAState(
        Uk=Uk,
        Sk=Sk,
        embeddings_norm=embeddings_norm,
        vocab=vocab,
        idf=idf_vector,
        term_index=term_index,
        book_index=book_index,
        books=books,
    )


def rekomendasi_buku(book_id: int, top_k: int = 6) -> List[Tuple[int, float]]:
    state = build_lsa()
    idx = state.book_index.get(book_id)
    if idx is None:
        return []
    target = state.embeddings_norm[idx]
    skor = state.embeddings_norm @ target
    urut = np.argsort(skor)[::-1]
    hasil = []
    for i in urut:
        if i == idx:
            continue
        hasil.append((state.books[i]["id"], float(skor[i])))
        if len(hasil) >= top_k:
            break
    return hasil


def cari_teks_lsa(query: str, top_k: int = 10) -> List[Tuple[int, float]]:
    state = build_lsa()
    tokens = [w for w in lsa.extractTokens(query) if len(w) > 2 and w not in lsa.STOPWORDS]
    freq = lsa.countFreq(tokens)
    total = sum(freq.values())
    if total == 0:
        return []
    query_vec = np.zeros(len(state.vocab), dtype=float)
    for word, count in freq.items():
        idx = state.term_index.get(word)
        if idx is not None:
            query_vec[idx] = count / total
    query_tfidf = query_vec * state.idf
    query_latent = lsa.embedQuery(query_tfidf, state.Uk, state.Sk)
    sims = lsa.cosineSimilarities(query_latent, state.embeddings_norm)
    ranking = lsa.rankSimilarDocuments(sims, top_k=top_k)
    return [(state.books[idx]["id"], skor) for idx, skor in ranking]


# ---------- PCA ----------
pca_cache = {
    "U_k": None,
    "dataset_coefficients": None,
    "valid_ids": None,
    "mapper": None,
    "X_mean": None,
}


def build_pca_model(k: int = KOMPONEN_PCA):
    if pca_cache["U_k"] is not None:
        return pca_cache

    mapper = load_mapper()
    images = []
    valid_ids = []

    for book_id in list(mapper.keys()):
        cover_path = COVERS_DIR / f"{book_id}.jpg"
        if cover_path.exists():
            try:
                img = Image.open(cover_path).convert("RGB")
                img = img.resize((200, 300))  # Changed to 200x300
                gray = rgb_to_grayscale(img)
                flat = matrix_to_vector(gray).astype(np.float32)
                images.append(flat)
                valid_ids.append(book_id)
            except Exception:
                continue

    if not images:
        raise RuntimeError("Tidak ada gambar sampul yang dapat diproses.")

    X_normalized, X_mean = normalize_data(images)
    U_k, eigenvalues = get_principal_basis(X_normalized, k)

    dataset_coefficients = []
    for img_vector in images:
        img_normalized = img_vector - X_mean.flatten()
        coeff = compute_coefficients(img_normalized, U_k)
        dataset_coefficients.append(coeff)
    dataset_coefficients = np.array(dataset_coefficients)

    pca_cache["U_k"] = U_k
    pca_cache["dataset_coefficients"] = dataset_coefficients
    pca_cache["valid_ids"] = valid_ids
    pca_cache["mapper"] = mapper
    pca_cache["X_mean"] = X_mean
    return pca_cache


# ---------- API ----------
@router.get("/ping")
def ping():
    return {"status": "ok", "message": "pong!"}


@router.get("/books")
def list_books(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=5, le=60),
    q: str | None = None,
):
    books = filter_books(q)
    total = len(books)
    start = (page - 1) * page_size
    end = start + page_size
    sliced = books[start:end]
    for item in sliced:
        item["snippet"] = read_snippet(item["id"])
    return {"items": sliced, "page": page, "page_size": page_size, "total": total}


@router.get("/books/{book_id}")
def get_book(book_id: int):
    mapper = load_mapper()
    meta = mapper.get(str(book_id))
    if not meta:
        raise HTTPException(status_code=404, detail="Book not found")
    content = read_content(str(book_id))
    rekom = rekomendasi_buku(book_id, top_k=6)
    rekomendasi = [
        {
            "id": rid,
            "title": mapper.get(str(rid), {}).get("title", ""),
            "score": skor,
        }
        for rid, skor in rekom
    ]
    return {
        "id": book_id,
        "title": meta.get("title", "").strip(),
        "cover": meta.get("cover", ""),
        "content": content,
        "recommendations": rekomendasi,
    }


@router.get("/search/title")
def search_title(
    q: str = Query(..., min_length=1),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=5, le=60),
):
    return list_books(page=page, page_size=page_size, q=q)


@router.get("/search/text")
def search_text(q: str = Query(..., min_length=1), top_k: int = Query(10, ge=1, le=30)):
    hits = cari_teks_lsa(q, top_k=top_k)
    mapper = load_mapper()
    return [
        {
            "id": rid,
            "title": mapper.get(str(rid), {}).get("title", ""),
            "score": skor,
        }
        for rid, skor in hits
    ]


@router.post("/image/retrieve")
async def retrieve_similar_book_covers(
    file: UploadFile = File(...),
    top_k: int = Query(5, ge=1, le=20),
    threshold: float = Query(0.0, ge=0.0, le=1.0),
):
    """
    Image Retrieval menggunakan PCA:
    - Upload gambar sampul
    - Hitung koefisien PCA
    - Ambil top_k gambar terdekat, filter dengan ambang similarity (0..1)
    """
    model = build_pca_model(k=KOMPONEN_PCA)

    contents = await file.read()
    query_image = Image.open(BytesIO(contents)).convert("RGB")
    query_image = query_image.resize((200, 300))  # Changed to 200x300
    query_gray = rgb_to_grayscale(query_image)
    query_flat = matrix_to_vector(query_gray).astype(np.float32)
    query_normalized = query_flat - model["X_mean"].flatten()
    query_coefficients = compute_coefficients(query_normalized, model["U_k"])

    indices, distances = retrieve_similar_images(
        query_coefficients,
        model["dataset_coefficients"],
        top_k=top_k,
    )

    # Konversi jarak ke similarity
    similarities = 1.0 / (1.0 + distances)
    results = []
    for idx, sim in zip(indices, similarities):
        if sim < threshold:
            continue
        book_id = model["valid_ids"][idx]
        book_info = model["mapper"].get(book_id, {})
        results.append(
            {
                "book_id": book_id,
                "title": book_info.get("title", ""),
                "cover": f"covers/{book_id}.jpg",
                "similarity": float(sim),
            }
        )

    return {"results": results, "count": len(results)}
