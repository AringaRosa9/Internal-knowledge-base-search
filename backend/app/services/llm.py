from __future__ import annotations

import json
import uuid

from app.config import settings

_client = None
_conversations: dict[str, list[dict]] = {}

SYSTEM_PROMPT = """あなたは社内ナレッジ検索アシスタントです。
ユーザーの質問に対して、提供された社内ドキュメントの情報のみに基づいて正確に回答してください。

## 回答ルール
1. 提供されたドキュメントに記載されている情報のみを使用してください
2. ドキュメントに記載されていない情報については「該当する情報は見つかりませんでした」と回答してください
3. 回答は簡潔かつ丁寧な日本語で記述してください
4. 情報の出典（ドキュメント名・ページ番号）を明記してください

## 回答フォーマット
以下のJSON形式で回答してください:
{
  "answer": "回答テキスト",
  "confidence_score": 0-100の整数（情報の確信度）,
  "cited_sources": [
    {"document_name": "ドキュメント名", "page": ページ番号}
  ]
}
"""


def _get_client():
    global _client
    if _client is not None:
        return _client

    if settings.llm_provider == "anthropic":
        import anthropic
        _client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    else:
        from openai import OpenAI
        _client = OpenAI(
            api_key=settings.custom_llm_api_key,
            base_url=settings.custom_llm_base_url,
        )
    return _client


def _get_model() -> str:
    if settings.llm_provider == "anthropic":
        return "claude-sonnet-4-20250514"
    return settings.custom_llm_model


def _call_llm(messages: list[dict]) -> str:
    client = _get_client()
    model = _get_model()

    if settings.llm_provider == "anthropic":
        response = client.messages.create(
            model=model,
            max_tokens=2048,
            system=SYSTEM_PROMPT,
            messages=messages,
        )
        return response.content[0].text
    else:
        oai_messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages
        response = client.chat.completions.create(
            model=model,
            max_tokens=2048,
            messages=oai_messages,
        )
        return response.choices[0].message.content or ""


def generate_answer(
    query: str,
    context_chunks: list[dict],
    conversation_id: str | None = None,
) -> dict:
    if conversation_id and conversation_id in _conversations:
        history = _conversations[conversation_id]
    else:
        conversation_id = conversation_id or str(uuid.uuid4())
        history = []

    context_text = "\n\n---\n\n".join(
        f"【出典: {c['metadata']['document_name']} / ページ{c['metadata']['page']}】\n{c['content']}"
        for c in context_chunks
    )

    user_message = f"""## 検索されたドキュメント
{context_text}

## ユーザーの質問
{query}

上記のドキュメントに基づいて、JSON形式で回答してください。"""

    messages = history + [{"role": "user", "content": user_message}]

    raw_text = _call_llm(messages)

    try:
        start = raw_text.index("{")
        end = raw_text.rindex("}") + 1
        result = json.loads(raw_text[start:end])
    except (ValueError, json.JSONDecodeError):
        result = {
            "answer": raw_text,
            "confidence_score": 50,
            "cited_sources": [],
        }

    history.append({"role": "user", "content": user_message})
    history.append({"role": "assistant", "content": raw_text})

    if len(history) > 20:
        history = history[-20:]

    _conversations[conversation_id] = history

    return {
        "answer": result.get("answer", raw_text),
        "confidence_score": result.get("confidence_score", 50),
        "cited_sources": result.get("cited_sources", []),
        "conversation_id": conversation_id,
    }
