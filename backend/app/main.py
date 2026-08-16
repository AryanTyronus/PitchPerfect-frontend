import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from app.api.endpoints.audio import audio_websocket
from app.api.router import api_router
from app.core.config import ALLOWED_ORIGINS, PORT

app = FastAPI(title="PitchPerfect Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/")
async def health_check() -> dict:
    return {"status": "ok", "service": "PitchPerfect Backend"}


@app.websocket("/ws/audio")
async def websocket_audio(websocket: WebSocket) -> None:
    await audio_websocket(websocket)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=PORT, reload=True)
