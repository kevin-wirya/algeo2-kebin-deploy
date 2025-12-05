from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from app.api.routes import router as api_router

app = FastAPI(title="E-Library Backend IF2123")

origins = [
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       
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
