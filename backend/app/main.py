from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from app.routers import game, search

app = FastAPI(title="Heardle VN API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")],
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(game.router)
app.include_router(search.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
