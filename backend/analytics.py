"""Teacher analytics router. All routes require teacher role.

Perf notes:
- Firestore client is sync. We parallelize calls via asyncio.to_thread
  so multiple collection streams happen concurrently instead of serially.
- A short TTL in-memory cache smooths the 30s dashboard polling and
  student-list search so we don't hammer Firestore on every poll.
- We pull a single 7-day `events_since` window and derive today's AI
  counts, the 7-day usage buckets, and recent activity all in-memory.
"""
from __future__ import annotations

import asyncio
import time
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends

from auth import require_teacher
import firestore_repo as repo


router = APIRouter(prefix="/api/analytics", tags=["analytics"])


# ─────────────── TTL cache (per-process) ───────────────

_CACHE: dict[str, tuple[float, Any]] = {}
_TEACHER_TTL_SEC = 8.0
_STUDENTS_TTL_SEC = 8.0


def _cache_get(key: str, ttl: float):
    hit = _CACHE.get(key)
    if not hit:
        return None
    ts, value = hit
    if time.monotonic() - ts > ttl:
        return None
    return value


def _cache_put(key: str, value: Any) -> None:
    _CACHE[key] = (time.monotonic(), value)


# ─────────────── Helpers ───────────────

def _start_of_today_iso() -> str:
    now = datetime.now(timezone.utc)
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    return start.isoformat()


def _days_ago_iso(days: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()


_VERB_MAP = {
    "chat": "asked the assistant about",
    "generate": "generated",
    "upload": "uploaded",
    "digitize": "digitized",
    "forum_post": "posted",
    "forum_reply": "replied to",
}


def _activity_from_event(event: dict[str, Any], user_map: dict[str, dict[str, Any]]) -> dict[str, Any]:
    uid = event.get("uid") or ""
    user = user_map.get(uid, {})
    name = user.get("displayName") or user.get("email") or "User"
    initials = "".join(part[0] for part in name.split()[:2]).upper() or "U"
    meta = event.get("metadata") or {}
    target = meta.get("target") or meta.get("title") or meta.get("topic") or meta.get("filename") or ""
    return {
        "id": event.get("id"),
        "name": name,
        "initials": initials,
        "action": _VERB_MAP.get(event.get("type", ""), event.get("type", "")),
        "target": target,
        "time": event.get("timestamp"),
        "type": event.get("type"),
    }


# ─────────────── Routes ───────────────

@router.get("/teacher")
async def teacher_overview(user=Depends(require_teacher)):
    cached = _cache_get("teacher_overview", _TEACHER_TTL_SEC)
    if cached is not None:
        return cached

    today_iso = _start_of_today_iso()
    seven_d_iso = _days_ago_iso(7)

    # Run all Firestore reads concurrently. Each to_thread is a separate
    # worker → collection streams happen in parallel.
    materials, forum, events_7d, students = await asyncio.gather(
        asyncio.to_thread(repo.list_materials),
        asyncio.to_thread(repo.post_stats),
        asyncio.to_thread(repo.events_since, seven_d_iso),
        asyncio.to_thread(repo.users_by_role, "student"),
    )

    # Derive everything from cached results — no more Firestore calls.
    materials_count = len(materials)
    materials_7d = sum(1 for m in materials if (m.get("uploadedAt") or "") >= seven_d_iso)
    courses = {m.get("course") for m in materials if m.get("course")}

    ai_today = [e for e in events_7d if e.get("type") in ("chat", "generate") and (e.get("timestamp") or "") >= today_iso]

    # Recent activity = top 10 by timestamp desc from the 7d window
    events_sorted = sorted(events_7d, key=lambda e: e.get("timestamp") or "", reverse=True)
    recent = events_sorted[:10]
    # Batch-resolve usernames from already-fetched student map + on-demand teacher fetches
    student_map = {s.get("uid"): s for s in students if s.get("uid")}
    needed_uids = {e.get("uid") for e in recent if e.get("uid") and e.get("uid") not in student_map}
    extra_users = await asyncio.to_thread(repo.get_users_by_uids, list(needed_uids)) if needed_uids else {}
    user_map = {**student_map, **extra_users}
    activity = [_activity_from_event(e, user_map) for e in recent]

    # 7-day usage buckets
    buckets: dict[str, int] = {}
    for i in range(6, -1, -1):
        d = (datetime.now(timezone.utc) - timedelta(days=i)).date().isoformat()
        buckets[d] = 0
    for e in events_7d:
        day = (e.get("timestamp") or "")[:10]
        if day in buckets:
            buckets[day] += 1
    usage7d = [{"date": k, "count": v} for k, v in buckets.items()]

    result = {
        "materialsCount": materials_count,
        "materialsLast7d": materials_7d,
        "coursesCount": len(courses),
        "studentsCount": len(students),
        "aiQueriesToday": len(ai_today),
        "forumStats": {"open": forum["open"], "answered": forum["answered"], "total": forum["total"]},
        "recentActivity": activity,
        "usage7d": usage7d,
    }
    _cache_put("teacher_overview", result)
    return result


@router.get("/students")
async def students_list(user=Depends(require_teacher)):
    """All students plus per-user engagement counters."""
    cached = _cache_get("students_list", _STUDENTS_TTL_SEC)
    if cached is not None:
        return cached

    students, events = await asyncio.gather(
        asyncio.to_thread(repo.users_by_role, "student"),
        asyncio.to_thread(repo.all_events),
    )

    counters: dict[str, dict[str, Any]] = {}
    for e in events:
        uid = e.get("uid")
        if not uid:
            continue
        c = counters.setdefault(
            uid,
            {"chat": 0, "generate": 0, "digitize": 0, "forum_post": 0, "forum_reply": 0, "total": 0, "lastActiveAt": ""},
        )
        t = e.get("type", "")
        if t in c:
            c[t] += 1
        c["total"] += 1
        ts = e.get("timestamp") or ""
        if ts > c["lastActiveAt"]:
            c["lastActiveAt"] = ts

    out = []
    for s in students:
        uid = s.get("uid")
        stats = counters.get(
            uid,
            {"chat": 0, "generate": 0, "digitize": 0, "forum_post": 0, "forum_reply": 0, "total": 0, "lastActiveAt": ""},
        )
        out.append(
            {
                "uid": uid,
                "email": s.get("email"),
                "displayName": s.get("displayName"),
                "photoURL": s.get("photoURL"),
                "stats": stats,
            }
        )

    out.sort(key=lambda x: x["stats"].get("total", 0), reverse=True)
    result = {"students": out, "total": len(out)}
    _cache_put("students_list", result)
    return result
