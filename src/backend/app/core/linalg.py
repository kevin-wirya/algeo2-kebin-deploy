import numpy as np

def normalize_data(vectors):
    """
    Normalisasi data sesuai teori:
    μ = (1/N) * Σ x_i
    x'_i = x_i - μ
    
    Input: vectors - list of numpy arrays, setiap array adalah vektor 1D (d elemen)
    Output:
        X_norm: matriks (d x N), kolom-kolom adalah vektor normalized
        mu: mean vector (d x 1)
    """
    # Konversi list of vectors jadi matriks (N x d)
    vectors_array = np.array(vectors)  # Shape: (N, d)
    
    # Hitung mean vector μ (1 x d) lalu transpose jadi (d x 1)
    mu = np.mean(vectors_array, axis=0).reshape(-1, 1)  # Shape: (d, 1)
    
    # Transpose jadi (d x N) dan normalisasi
    X = vectors_array.T  # Shape: (d, N)
    X_norm = X - mu      # Broadcasting: (d, N) - (d, 1) = (d, N)
    
    return X_norm, mu

def power_iteration(A, max_iter=1000, tol=1e-6):
    n = A.shape[0]
    v = np.random.rand(n)
    v /= np.linalg.norm(v)

    prev_lambda = 0.0

    for _ in range(max_iter):
        w = A.dot(v)
        v = w / np.linalg.norm(w)
        lam = v.dot(A.dot(v))

        if abs(lam - prev_lambda) < tol:
            break

        prev_lambda = lam

    return lam, v

def deflate(A, eigenvalue, eigenvector):
    """
    A_new = A - λ * v * v^T
    """
    v = eigenvector.reshape(-1, 1)
    return A - eigenvalue * (v @ v.T)

def compute_eigen_k(A, k, max_iter=1000, tol=1e-6):
    """
    Hitung k eigenvalues dan eigenvectors terbesar menggunakan power iteration + deflation
    Output: eigenvalues dan eigenvectors sorted DESCENDING (terbesar dulu)
    """
    A_work = A.copy()
    eigenvalues = []
    eigenvectors = []

    for _ in range(k):
        lam, v = power_iteration(A_work, max_iter=max_iter, tol=tol)
        eigenvalues.append(lam)
        eigenvectors.append(v)
        A_work = deflate(A_work, lam, v)

    eigenvalues = np.array(eigenvalues)
    eigenvectors = np.column_stack(eigenvectors)
    
    # Sort descending berdasarkan eigenvalues
    idx = np.argsort(eigenvalues)[::-1]
    eigenvalues = eigenvalues[idx]
    eigenvectors = eigenvectors[:, idx]
    
    return eigenvalues, eigenvectors

def svd_manual(A, k=None):
    A = A.astype(float)
    d, n = A.shape

    if k is None:
        k = min(d, n)

    ATA = A.T.dot(A)

    eigenvalues, V = compute_eigen_k(ATA, k)

    S = np.sqrt(np.maximum(eigenvalues, 0))

    U = np.zeros((d, k))
    for i in range(k):
        if S[i] > 1e-12:
            U[:, i] = (A.dot(V[:, i])) / S[i]

            nrm = np.linalg.norm(U[:, i])
            if nrm > 1e-12:
                U[:, i] /= nrm
        else:
            U[:, i] = 0

    Vt = V.T

    return U, S, Vt

def covariance_matrix(X):
    """
    X: matriks (d x N)
    Cov = (1/N) X X^T
    """
    N = X.shape[1]
    return (X @ X.T) / N

def euclidean_distance(v1, v2):
    """
    Hitung jarak Euclidean antara dua vektor
    d = sqrt(Σ (v1_i - v2_i)^2)
    
    Untuk PCA: mengukur jarak antara vektor koefisien
    """
    diff = v1 - v2
    return np.sqrt(np.sum(diff ** 2))


def cosine_similarity(v1, v2):
    """
    Hitung cosine similarity antara dua vektor
    sim = (v1 · v2) / (||v1|| * ||v2||)
    
    Untuk LSA: mengukur kemiripan arah antara embedding dokumen
    Nilai: -1 (berlawanan) hingga 1 (sama)
    """
    dot_product = np.dot(v1, v2)
    norm_v1 = np.linalg.norm(v1)
    norm_v2 = np.linalg.norm(v2)
    
    if norm_v1 < 1e-10 or norm_v2 < 1e-10:
        return 0.0
    
    return dot_product / (norm_v1 * norm_v2)


def normalize_vector(v):
    """
    Normalize vektor menjadi unit vector (panjang 1)
    Untuk LSA: normalisasi embedding dokumen sebelum hitung cosine similarity
    """
    norm = np.linalg.norm(v)
    if norm < 1e-10:
        return v
    return v / norm
