from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from app.api.routes import router as api_router

app = FastAPI(title="E-Library Backend IF2123")

origins = [
    "http://localhost:5173",
    "https://*.vercel.app",
    "https://algeo2-kebin-deploy.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],     
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Backend siap!"}

@app.get("/debug/check-data")
def check_data():
    import os
    from pathlib import Path
    data_dir = Path(__file__).resolve().parents[2] / "data"
    return {
        "data_exists": data_dir.exists(),
        "txt_exists": (data_dir / "txt").exists(),
        "txt_count": len(list((data_dir / "txt").glob("*.txt"))) if (data_dir / "txt").exists() else 0,
        "covers_count": len(list((data_dir / "covers").glob("*.jpg"))) if (data_dir / "covers").exists() else 0,
        "mapper_exists": (data_dir / "mapper.json").exists(),
        "data_path": str(data_dir),
    }

# router utama untuk API
app.include_router(api_router, prefix="/api")

# Serve static files dari data folder
data_dir = os.path.join(os.path.dirname(__file__), "..", "..", "data")
if os.path.exists(data_dir):
    app.mount("/data", StaticFiles(directory=data_dir), name="data")
