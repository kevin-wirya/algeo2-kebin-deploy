from typing import List

import numpy as np

from .linalg import svd_manual

STOPWORDS = {
   "the", "and", "you", "are", "for", "that", "with", "have", "this", "but",
   "not", "all", "was", "his", "her", "she", "him", "from", "your", "they",
   "say", "who", "had", "one", "our", "out", "their", "there", "been", "any",
   "more", "when", "into", "than", "some", "its", "what", "can", "like",
   "about", "them", "could", "will", "would", "which", "because", "other",
   "over", "such", "only", "ever", "many", "most", "did", "how", "just",
   "on", "in", "at", "is", "am", "we", "it", "of", "to", "as", "so", "up",
   "down", "off", "if", "then", "do", "does", "been", "being", "very", "also",
   "i", "me", "my", "mine", "he", "his", "hers", "them", "theirs", "those",
   "these", "before", "after", "again", "once", "why", "where", "while",
}

def extractTokens(text: str) -> list[str]:
   text = text.lower()
   tokens = []
   current = []


   for c in text:
       if 'a' <= c <= 'z':
           current.append(c)
       else:
           if current:
               tokens.append("".join(current))
               current = []


   if current:
       tokens.append("".join(current))


   return tokens

def tokenize(text: str) -> List[str]:
  allTokens = extractTokens(text)


  cleanTokens = [ ]
  for word in allTokens:
      if len(word) > 2 and word not in STOPWORDS:
          cleanTokens.append(word)


  return cleanTokens

def countFreq(tokens: list[str]) -> dict[str, int]:
   freq = {}
   for word in tokens:
       if word in freq:
           freq[word] += 1
       else:
           freq[word] = 1


   return freq

def buildVocabulary(list_of_frequencies: list[dict[str, int]]) -> list[str]:
   vocab_set = set()


   for freq in list_of_frequencies:
       vocab_set.update(freq.keys())


   return sorted(vocab_set)

def makeTDmatrix(vocabulary: list[str], list_of_frequencies: list[dict[str, int]]) -> np.ndarray:
   m = len(vocabulary)
   n = len(list_of_frequencies)


   matrix = np.zeros((m, n), dtype=np.float32)


   term_index = {term: i for i, term in enumerate(vocabulary)}


   for j, freq in enumerate(list_of_frequencies):
       for word, count in freq.items():
           if word in term_index:
               i = term_index[word]
               matrix[i, j] = count

   return matrix

def compute_tf(matrix: list[list[int]]) -> np.ndarray:
   A = np.array(matrix, dtype=float) 
   m, n = A.shape


   tf = np.zeros((m, n), dtype=float)


   for j in range(n): 
       col_sum = np.sum(A[:, j])
       if col_sum > 0:
           tf[:, j] = A[:, j] / col_sum
       else:
           tf[:, j] = 0.0   


   return tf


def compute_idf(matrix: list[list[int]]) -> np.ndarray:
   A = np.array(matrix)
   m, n = A.shape

   df = np.count_nonzero(A > 0, axis=1)

   idf = np.log10(n / (1 + df))
   return idf.astype(float)


def compute_tfidf(matrix: list[list[int]]) -> np.ndarray:
   tf = compute_tf(matrix)          
   idf = compute_idf(matrix) 

   tfidf = tf * idf.reshape(-1, 1)

   return tfidf


def truncatedSVD(tfidf_matrix: np.ndarray, k: int):
   Uk, Sk, Vt = svd_manual(tfidf_matrix, k)
   Vk = Vt.T 

   return Uk, Sk, Vk


def computeDocumentEmbeddings(Vk: np.ndarray, singular_values: np.ndarray) -> np.ndarray:
   if Vk.shape[1] != singular_values.shape[0]:
       raise ValueError("Dimensi Vk dan Σ tidak cocok")
   
   return Vk * singular_values


def normalizeDocuments(embeddings: np.ndarray) -> np.ndarray:
   norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
   norms[norms == 0] = 1e-12

   return embeddings / norms


def embedQuery(tfidf_vector: np.ndarray, Uk: np.ndarray, singular_values: np.ndarray) -> np.ndarray:
   tfidf_vector = np.asarray(tfidf_vector, dtype=float)

   latent = tfidf_vector @ Uk
   sigma_safe = np.where(singular_values == 0, 1e-12, singular_values)

   latent = latent / sigma_safe
   norm = np.linalg.norm(latent)

   if norm == 0:
       return latent
   return latent / norm


def cosineSimilarities(normalized_query: np.ndarray, normalized_docs: np.ndarray) -> np.ndarray:
  
   return normalized_docs @ normalized_query


def rankSimilarDocuments(similarities: np.ndarray, top_k: int = 10) -> list[tuple[int, float]]:
  
   if similarities.ndim != 1:
       raise ValueError("Vektor similarity harus berdimensi 1")
   order = np.argsort(similarities)[::-1]
   hasil = []
   for idx in order[:top_k]:
       skor = float(similarities[idx])
       if skor <= 0:
           continue
       hasil.append((int(idx), skor))
   return hasil
