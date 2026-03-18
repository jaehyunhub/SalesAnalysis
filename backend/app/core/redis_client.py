import json
from typing import Any, Optional

import redis

from app.core.config import settings


def get_redis_client() -> Optional[redis.Redis]:
    """Redis 클라이언트를 반환한다. 연결 실패 시 None 반환 (캐싱 무효화)."""
    try:
        client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        client.ping()
        return client
    except Exception:
        return None


def cache_get(key: str) -> Optional[Any]:
    """캐시에서 값을 조회한다. 없거나 오류 시 None 반환."""
    try:
        client = get_redis_client()
        if client is None:
            return None
        raw = client.get(key)
        if raw is None:
            return None
        return json.loads(raw)
    except Exception:
        return None


def cache_set(key: str, value: Any, ttl: int = 300) -> None:
    """캐시에 값을 저장한다 (기본 5분). 오류 시 조용히 무시."""
    try:
        client = get_redis_client()
        if client is None:
            return
        client.setex(key, ttl, json.dumps(value, ensure_ascii=False, default=str))
    except Exception:
        pass


def cache_delete_pattern(pattern: str) -> None:
    """패턴에 맞는 캐시 키를 모두 삭제한다."""
    try:
        client = get_redis_client()
        if client is None:
            return
        keys = client.keys(pattern)
        if keys:
            client.delete(*keys)
    except Exception:
        pass
