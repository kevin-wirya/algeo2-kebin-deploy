import numpy as np
from PIL import Image
import os


def rgb_to_grayscale(img):
   if img.mode != 'RGB':
       img = img.convert('RGB')
  
   width, height = img.size
   pixels = img.load()
  
   grayscale_matrix = []
   for y in range(height):
       row = []
       for x in range(width):
           r, g, b = pixels[x, y]
           intensity = 0.2126 * r + 0.7152 * g + 0.0722 * b
           row.append(intensity)
       grayscale_matrix.append(row)

   return np.array(grayscale_matrix)

def matrix_to_vector(matrix):
   return matrix.flatten(order='F')

def load_images_from_folder(folder_path, target_size=(300, 200), max_images=None):
   print(f"Loading gambar dari: {folder_path}")
   print(f"Target size: {target_size[0]}x{target_size[1]} = {target_size[0]*target_size[1]} pixels")
  
   # List semua file gambar
   image_files = [f for f in os.listdir(folder_path)
                  if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
   image_files.sort()  # Sort by filename
  
   if max_images is not None:
       image_files = image_files[:max_images]
  
   print(f"Total gambar yang akan diproses: {len(image_files)}")
  
   vectors = []
   filenames = []
  
   for idx, filename in enumerate(image_files):
       if (idx + 1) % 50 == 0 or (idx + 1) == len(image_files):
           print(f"Progress: {idx + 1}/{len(image_files)} gambar...")
       img_path = os.path.join(folder_path, filename)
       try:
           img = Image.open(img_path)
           img = img.resize(target_size, Image.LANCZOS)
           # Konversi ke grayscale
           grayscale = rgb_to_grayscale(img)
           # Flatten ke vektor
           vec = matrix_to_vector(grayscale)
           vectors.append(vec)
           filenames.append(filename)
       except Exception as e:
           print(f"Error loading {filename}: {e}")
           continue
  
   print(f"Berhasil load {len(vectors)} gambar")
   return vectors, filenames

# Jika dijalankan sebagai script (untuk testing)
if __name__ == "__main__":
   folder = "../../data/covers"
   # Test dengan 10 gambar dulu
   vectors, filenames = load_images_from_folder(folder, target_size=(300, 200), max_images=10)
   print(f"\nHasil:")
   print(f"Jumlah gambar: {len(vectors)}")
   print(f"Dimensi setiap vektor: {vectors[0].shape}")
   print(f"Files: {filenames[:5]}")
