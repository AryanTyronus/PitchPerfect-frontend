import asyncio
import json
import logging
import re
from typing import Any, Optional

from app.core.config import (
    GROQ_API_KEY,
    LLM_MODEL,
    OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL,
    OPENROUTER_LLM_MODEL,
)
from app.models.metrics import EvaluationResult, SpeechMetrics, SubScores, create_disqualified_evaluation
from app.services.star_evaluator import evaluate_locally
from app.services.transcript_norm import is_valid_transcript

logger = logging.getLogger("app.llm_evaluator")

# Low temperature keeps scoring deterministic and reproducible across runs.
LLM_TEMPERATURE = 0.1

EVALUATION_TRACKS = {
    "job_interview": "Job Interview",
    "technical_interview": "Technical Interview",
    "behavioural_interview": "Behavioural Interview",
    "public_speaking": "Public Speaking",
    "college_interview": "College Interview",
}

_JSON_SCHEMA_HINT = (
    '{"score": <int 0-100>, "disqualified": <bool>, '
    '"feedback": "<2-4 sentence critique>", '
    '"sub_scores": {"clarity": <int 0-20>, "relevance": <int 0-20>, '
    '"professionalism": <int 0-20>, "structure": <int 0-20>, "impact": <int 0-20>}}'
)

SYSTEM_PROMPT_TEMPLATE = """You are a strict, calibrated expert evaluator for {track_label} answers.
You grade spoken-answer transcripts. You NEVER inflate scores and you never reward mere effort.

CALIBRATED SCORING RUBRIC (overall score 0-100):
- 0: no usable response (empty, silence, unintelligible, pure noise)
- 1-20: disqualified or incoherent answer (off-topic rambling, single words, gibberish)
- 21-40: poor (barely relevant, severe disfluency, no structure, no substance)
- 41-60: mediocre (partially answers the question, generic content, weak structure)
- 61-80: solid (clear, relevant, reasonably structured with concrete points)
- 81-100: world-class (exceptional clarity, relevance, professionalism, structure, impact)

AUTOMATIC DISQUALIFICATION RULES:
a. Empty transcript, pure noise, unintelligible audio, or fewer than ~3 meaningful words
   -> score MUST be 0 and disqualified MUST be true.
b. Severe professional misconduct: workplace violence, threats, harassment, sexual
   inappropriateness, discrimination, illegal conduct, or absurd/non-serious content
   -> score MUST be clamped strictly between 0 and 10 and disqualified MUST be true.

SUB-SCORES (each 0-20):
- clarity: easy to understand, articulate, minimal filler
- relevance: directly answers the question asked
- professionalism: appropriate tone and conduct for a professional setting
- structure: logical organization (e.g., STAR format, intro/body/close)
- impact: concrete results, specifics, memorable takeaway

STRICT RULES:
- Never use a middle-of-the-road default score when evidence is weak; low-quality
  transcripts MUST receive low scores. Central tendency is a grading failure.
- The overall score must be consistent with sub-scores (roughly average of the five).
- Respond with ONLY valid JSON matching this exact schema, no markdown, no commentary:
{schema}"""


def _build_system_prompt(track: str) -> str:
    track_label = EVALUATION_TRACKS.get(track, EVALUATION_TRACKS["job_interview"])
    return SYSTEM_PROMPT_TEMPLATE.format(track_label=track_label, schema=_JSON_SCHEMA_HINT)


def _build_user_prompt(text: str, question: Optional[str]) -> str:
    parts = []
    if question:
        parts.append(f"Question asked: {question}")
    parts.append(f"Transcript to evaluate: {text!r}")
    return "\n".join(parts)


def _coerce_evaluation(data: Any, source: str) -> EvaluationResult:
    """Validate raw LLM JSON into the pydantic schema; clamp out-of-range values."""
    if not isinstance(data, dict):
        raise ValueError("LLM response was not a JSON object")
    sub = data.get("sub_scores") or {}
    subscores = SubScores(
        clarity=int(float(sub.get("clarity", 0))),
        relevance=int(float(sub.get("relevance", 0))),
        professionalism=int(float(sub.get("professionalism", 0))),
        structure=int(float(sub.get("structure", 0))),
        impact=int(float(sub.get("impact", 0))),
    )
    result = EvaluationResult(
        score=int(round(float(data.get("score", 0)))),
        disqualified=bool(data.get("disqualified", False)),
        feedback=str(data.get("feedback", ""))[:2000],
        sub_scores=subscores,
        source=source,
    )
    # Keep overall consistent with sub-scores to fight central tendency drift.
    derived = int(round(subscores.average() * 5))
    if abs(result.score - derived) > 15:
        result.score = min(max(derived, 0), 100)
    return result


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


async def evaluate_answer(
    text: str,
    metrics: SpeechMetrics,
    track: str = "job_interview",
    question: Optional[str] = None,
) -> EvaluationResult:
    """Evaluate a transcript. Pre-validates before any LLM call so empty/noise
    recordings get a deterministic zero without spending tokens."""
    normalized = (text or "").strip()
    if not is_valid_transcript(normalized):
        return create_disqualified_evaluation()

    system_prompt = _build_system_prompt(track)
    user_prompt = _build_user_prompt(normalized, question)
    last_err: Optional[Exception] = None

    # Primary: Groq
    if GROQ_API_KEY:
        try:
            from groq import Groq

            client = Groq(api_key=GROQ_API_KEY)
            response: Any = await asyncio.to_thread(
                client.chat.completions.create,
                model=LLM_MODEL,
                temperature=LLM_TEMPERATURE,
                max_tokens=500,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
            )
            data = _extract_json(response.choices[0].message.content)
            return _coerce_evaluation(data, source="groq")
        except Exception as exc:
            last_err = exc
            logger.warning("Groq evaluation failed, trying fallback: %s", exc)

    # Fallback: OpenRouter (OpenAI-compatible chat)
    if OPENROUTER_API_KEY:
        try:
            import httpx

            payload = {
                "model": OPENROUTER_LLM_MODEL,
                "temperature": LLM_TEMPERATURE,
                "max_tokens": 500,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "response_format": {"type": "json_object"},
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
            return _coerce_evaluation(data, source="openrouter")
        except Exception as exc:
            last_err = exc
            logger.warning("OpenRouter evaluation failed, using local heuristic: %s", exc)

    if last_err is not None:
        logger.error("All LLM providers failed: %s", last_err)

    # Final fallback: local heuristic (never raises)
    try:
        return evaluate_locally(normalized, metrics)
    except Exception as exc:
        logger.error("Local evaluation failed: %s", exc)
        return create_disqualified_evaluation(source="local")
