import os
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY: str | None = os.getenv("GROQ_API_KEY")
GROQ_MODEL: str = os.getenv("GROQ_MODEL", "whisper-large-v3")
PORT: int = int(os.getenv("PORT", "8000"))
SUPABASE_URL: str | None = os.getenv("SUPABASE_URL")
SUPABASE_KEY: str | None = os.getenv("SUPABASE_KEY")
API_TOKEN: str | None = os.getenv("API_TOKEN")
LLM_MODEL: str = os.getenv("LLM_MODEL", "llama-3.1-8b-instant")

OPENROUTER_API_KEY: str | None = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_BASE_URL: str = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
OPENROUTER_STT_MODEL: str = os.getenv("OPENROUTER_STT_MODEL", "openai/whisper-1")
OPENROUTER_LLM_MODEL: str = os.getenv("OPENROUTER_LLM_MODEL", "openai/gpt-4o-mini")

ALLOWED_ORIGINS: list[str] = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

if os.getenv("ALLOWED_ORIGINS"):
    ALLOWED_ORIGINS = [origin.strip() for origin in os.environ["ALLOWED_ORIGINS"].split(",") if origin.strip()]
