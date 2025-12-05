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

# router utama untuk API
app.include_router(api_router, prefix="/api")

# Serve static files dari data folder
data_dir = os.path.join(os.path.dirname(__file__), "..", "..", "data")
if os.path.exists(data_dir):
    app.mount("/data", StaticFiles(directory=data_dir), name="data")
