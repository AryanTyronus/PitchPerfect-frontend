import asyncio
import json
import re
from typing import Any, Optional

from app.core.config import (
    GROQ_API_KEY,
    LLM_MODEL,
    OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL,
    OPENROUTER_LLM_MODEL,
)
from app.models.metrics import EvaluationResult, SpeechMetrics
from app.services.star_evaluator import evaluate_locally


def _extract_json(content: str) -> dict:
    content = content.strip()
    try:
        return json.loads(content)
    except Exception:
        pass
    match = re.search(r"\{.*\}", content, re.DOTALL)
    if not match:
        raise ValueError("No JSON found in LLM response")
    return json.loads(match.group(0))


def _build_prompt(text: str) -> str:
    return (
        "Evaluate this interview answer. Respond with ONLY valid JSON (no markdown, no commentary) "
        "using this exact schema: "
        '{"overall_score": <0-100>, "clarity": {"score": <0-100>, "rationale": "..."}, '
        '"confidence": {"score": <0-100>, "rationale": "..."}, '
        '"structure": {"score": <0-100>, "rationale": "..."}, '
        '"strengths": ["...", "..."], "improvements": ["...", "..."]}. '
        "CRITICAL RULE: If the provided transcript is empty, contains only repetitive noise, "
        "or is completely unintelligible (e.g., random sounds, single words repeated, "
        "or fewer than 3 meaningful words), you MUST return an overall score of 0 with "
        "0 across all rubric dimensions (clarity, confidence, structure) and note that "
        "no coherent response was provided. Do not hallucinate content or apply baseline scores. "
        f"Answer: {text}"
    )


async def evaluate_answer(text: str, metrics: SpeechMetrics) -> EvaluationResult:
    prompt = _build_prompt(text)
    last_err: Optional[Exception] = None

    # Primary: Groq
    if GROQ_API_KEY:
        try:
            from groq import Groq

            client = Groq(api_key=GROQ_API_KEY)
            response: Any = await asyncio.to_thread(
                client.chat.completions.create,
                model=LLM_MODEL,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
            )
            data = json.loads(response.choices[0].message.content)
            data["source"] = "groq"
            return EvaluationResult.model_validate(data)
        except Exception as exc:
            last_err = exc

    # Fallback: OpenRouter (OpenAI-compatible chat)
    if OPENROUTER_API_KEY:
        try:
            import httpx

            payload = {
                "model": OPENROUTER_LLM_MODEL,
                "messages": [{"role": "user", "content": prompt}],
            }
            headers = {
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
            }
            async with httpx.AsyncClient(timeout=60) as client:
                resp = await client.post(
                    f"{OPENROUTER_BASE_URL}/chat/completions",
                    headers=headers,
                    json=payload,
                )
                resp.raise_for_status()
                content = resp.json()["choices"][0]["message"]["content"]
            data = _extract_json(content)
            data["source"] = "openrouter"
            return EvaluationResult.model_validate(data)
        except Exception as exc:
            last_err = exc

    # Final fallback: local heuristic
    return evaluate_locally(text, metrics)
