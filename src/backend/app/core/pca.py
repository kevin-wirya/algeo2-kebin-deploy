import numpy as np
from typing import Tuple
from app.core.linalg import svd_manual, euclidean_distance

Array = np.ndarray

def get_principal_basis(X: Array, k: int) -> Tuple[Array, Array]:
    U, S, Vt = svd_manual(X, k=k)
    eigenvalues = (S ** 2) / (X.shape[1])
    return U, eigenvalues


def compute_coefficients(image_vector: Array, U_k: Array) -> Array:
    return U_k.T @ image_vector


def retrieve_similar_images(query_coefficients: Array, dataset_coefficients: Array, top_k: int = 5) -> Tuple[Array, Array]:
    distances = np.array([
        euclidean_distance(query_coefficients, dataset_coefficients[i])
        for i in range(dataset_coefficients.shape[0])
    ])
    indices = np.argsort(distances)[:top_k]
    return indices, distances[indices]
