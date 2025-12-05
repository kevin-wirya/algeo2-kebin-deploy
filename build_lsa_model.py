"""
Script to pre-compute LSA model and save to disk.
Run this locally once to generate lsa_model.pkl.
"""
import pickle
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent / "src" / "backend"
sys.path.insert(0, str(backend_path))

from app.api.routes import build_lsa

def main():
    print("Starting LSA model computation...")
    print("This may take several minutes depending on dataset size.")
    
    try:
        state = build_lsa()
        
        # Save to data folder
        output_path = Path(__file__).parent / "data" / "lsa_model.pkl"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        print(f"Saving model to {output_path}...")
        with open(output_path, 'wb') as f:
            pickle.dump(state, f, protocol=pickle.HIGHEST_PROTOCOL)
        
        print(f"✓ LSA model saved successfully!")
        print(f"  - Vocabulary size: {len(state.vocab)}")
        print(f"  - Number of books: {len(state.books)}")
        print(f"  - Embedding dimensions: {state.embeddings_norm.shape}")
        print(f"  - File size: {output_path.stat().st_size / 1024 / 1024:.2f} MB")
        
    except Exception as e:
        print(f"✗ Error during LSA computation: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
