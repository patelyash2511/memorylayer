# Copyright (c) 2026 Yash Patel / rec0.ai
# Licensed under MIT License
# https://github.com/patelyash2511/rec0/blob/main/LICENSE

"""Embedding service for rec0.

Uses fastembed (ONNX Runtime) with BAAI/bge-small-en-v1.5.
100% private: no user memory content ever leaves rec0 servers.
384-dimensional normalised vectors. No PyTorch — small Docker image.
"""

from __future__ import annotations

import json
import logging
from typing import List, Optional

logger = logging.getLogger(__name__)

_embedding_model = None
# fastembed model name — ONNX, 384-dim, Apache-2.0, ~130 MB download
_MODEL_NAME = "BAAI/bge-small-en-v1.5"


def get_embedding_model():
    """Load the ONNX model once and reuse for every subsequent request."""
    global _embedding_model
    if _embedding_model is None:
        from fastembed import TextEmbedding
        logger.info("Loading embedding model: %s", _MODEL_NAME)
        _embedding_model = TextEmbedding(_MODEL_NAME)
        logger.info("Embedding model ready.")
    return _embedding_model


def embed(text: str) -> List[float]:
    """Return a 384-dim normalised embedding vector for the given text.

    Runs entirely on local CPU via ONNX Runtime — no external API call.
    """
    model = get_embedding_model()
    return next(model.embed([text])).tolist()


def cosine_similarity(a: List[float], b: List[float]) -> float:
    """Cosine similarity between two equal-length float vectors.

    Because vectors are L2-normalised, this equals the dot product.
    """
    return max(0.0, min(1.0, sum(x * y for x, y in zip(a, b))))


def compute_similarity(
    query: str,
    content: str,
    query_emb: Optional[List[float]],
    content_emb_json: Optional[str],
) -> float:
    """Return semantic similarity score in [0, 1].

    Uses precomputed embeddings when available (fast path);
    falls back to embedding on-the-fly for content stored before
    the embedding column was added.
    """
    if query_emb is None:
        query_emb = embed(query)

    if content_emb_json:
        try:
            content_emb = json.loads(content_emb_json)
            return round(cosine_similarity(query_emb, content_emb), 4)
        except Exception:
            pass

    # Content has no stored embedding — embed on-the-fly
    content_emb = embed(content)
    return round(cosine_similarity(query_emb, content_emb), 4)
