"""Firestore data access layer for materials, forum posts, analytics events.

Keeps Firestore API surface in one place so route handlers stay thin.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Iterable, Optional

from google.cloud.firestore_v1 import FieldFilter
from google.cloud.firestore_v1.base_query import BaseCompositeFilter

from firebase_admin_init import db, firestore


MATERIALS_COLLECTION = "materials"
FORUM_COLLECTION = "forum_posts"
EVENTS_COLLECTION = "analytics_events"
USERS_COLLECTION = "users"


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ─────────────── Materials ───────────────

def list_materials() -> list[dict[str, Any]]:
    snaps = db.collection(MATERIALS_COLLECTION).stream()
    out: list[dict[str, Any]] = []
    for s in snaps:
        d = s.to_dict() or {}
        d["id"] = d.get("id") or s.id
        out.append(d)
    return out


def get_material(file_id: str) -> Optional[dict[str, Any]]:
    snap = db.collection(MATERIALS_COLLECTION).document(file_id).get()
    if not snap.exists:
        return None
    d = snap.to_dict() or {}
    d["id"] = d.get("id") or snap.id
    return d


def upsert_material(file_id: str, data: dict[str, Any]) -> dict[str, Any]:
    data = {**data, "id": file_id, "filename": data.get("filename", file_id)}
    data.setdefault("uploadedAt", _utc_now_iso())
    db.collection(MATERIALS_COLLECTION).document(file_id).set(data, merge=True)
    return data


def delete_material(file_id: str) -> None:
    db.collection(MATERIALS_COLLECTION).document(file_id).delete()


def update_material(file_id: str, updates: dict[str, Any]) -> Optional[dict[str, Any]]:
    ref = db.collection(MATERIALS_COLLECTION).document(file_id)
    snap = ref.get()
    if not snap.exists:
        return None
    ref.update(updates)
    return (ref.get().to_dict() or {}) | {"id": file_id}


def materials_count_since(iso_ts: str) -> int:
    q = db.collection(MATERIALS_COLLECTION).where(filter=FieldFilter("uploadedAt", ">=", iso_ts))
    return sum(1 for _ in q.stream())


def distinct_courses() -> list[str]:
    snaps = db.collection(MATERIALS_COLLECTION).stream()
    seen = set()
    for s in snaps:
        c = (s.to_dict() or {}).get("course")
        if c:
            seen.add(c)
    return sorted(seen)


# ─────────────── Forum ───────────────

def list_posts() -> list[dict[str, Any]]:
    posts_ref = db.collection(FORUM_COLLECTION).order_by(
        "timestamp", direction=firestore.Query.DESCENDING
    )
    out: list[dict[str, Any]] = []
    for snap in posts_ref.stream():
        d = snap.to_dict() or {}
        d["id"] = snap.id
        d["replies"] = [
            {**(r.to_dict() or {}), "id": r.id}
            for r in snap.reference.collection("replies").order_by("timestamp").stream()
        ]
        out.append(d)
    return out


def get_post(post_id: str) -> Optional[dict[str, Any]]:
    ref = db.collection(FORUM_COLLECTION).document(post_id)
    snap = ref.get()
    if not snap.exists:
        return None
    d = snap.to_dict() or {}
    d["id"] = snap.id
    d["replies"] = [
        {**(r.to_dict() or {}), "id": r.id}
        for r in ref.collection("replies").order_by("timestamp").stream()
    ]
    return d


def create_post(
    *,
    title: str,
    content: str,
    author: str,
    author_type: str,
    author_uid: Optional[str] = None,
) -> dict[str, Any]:
    post_id = str(uuid.uuid4())
    data = {
        "id": post_id,
        "title": title,
        "content": content,
        "author": author,
        "authorType": author_type,
        "authorUid": author_uid,
        "timestamp": _utc_now_iso(),
        "replyCount": 0,
    }
    db.collection(FORUM_COLLECTION).document(post_id).set(data)
    return {**data, "replies": []}


def add_reply(
    post_id: str,
    *,
    content: str,
    author: str,
    author_type: str,
    author_uid: Optional[str] = None,
) -> Optional[dict[str, Any]]:
    post_ref = db.collection(FORUM_COLLECTION).document(post_id)
    if not post_ref.get().exists:
        return None
    reply_id = str(uuid.uuid4())
    reply = {
        "id": reply_id,
        "content": content,
        "author": author,
        "authorType": author_type,
        "authorUid": author_uid,
        "timestamp": _utc_now_iso(),
    }
    post_ref.collection("replies").document(reply_id).set(reply)
    post_ref.update({"replyCount": firestore.Increment(1)})
    return reply


def post_stats() -> dict[str, int]:
    total = 0
    answered = 0
    for snap in db.collection(FORUM_COLLECTION).stream():
        total += 1
        if (snap.to_dict() or {}).get("replyCount", 0) > 0:
            answered += 1
    return {"total": total, "answered": answered, "open": total - answered}


# ─────────────── Analytics events ───────────────

EventType = str  # 'chat' | 'generate' | 'upload' | 'digitize' | 'forum_post' | 'forum_reply'


def log_event(
    *,
    event_type: EventType,
    uid: Optional[str],
    role: Optional[str] = None,
    metadata: Optional[dict[str, Any]] = None,
) -> None:
    if not uid:
        return  # anonymous; skip
    event_id = str(uuid.uuid4())
    db.collection(EVENTS_COLLECTION).document(event_id).set(
        {
            "id": event_id,
            "type": event_type,
            "uid": uid,
            "role": role,
            "metadata": metadata or {},
            "timestamp": _utc_now_iso(),
        }
    )


def events_since(iso_ts: str, types: Optional[Iterable[str]] = None) -> list[dict[str, Any]]:
    # Single-field where on timestamp (auto-indexed). Type filter done in memory
    # to avoid requiring a composite index — data volume is small.
    q = db.collection(EVENTS_COLLECTION).where(filter=FieldFilter("timestamp", ">=", iso_ts))
    all_events = [{**(s.to_dict() or {}), "id": s.id} for s in q.stream()]
    if types:
        allowed = set(types)
        return [e for e in all_events if e.get("type") in allowed]
    return all_events


def all_events() -> list[dict[str, Any]]:
    return [{**(s.to_dict() or {}), "id": s.id} for s in db.collection(EVENTS_COLLECTION).stream()]


def recent_events(limit: int = 10) -> list[dict[str, Any]]:
    q = (
        db.collection(EVENTS_COLLECTION)
        .order_by("timestamp", direction=firestore.Query.DESCENDING)
        .limit(limit)
    )
    return [{**(s.to_dict() or {}), "id": s.id} for s in q.stream()]


# ─────────────── Users ───────────────

def get_user_profile(uid: str) -> Optional[dict[str, Any]]:
    snap = db.collection(USERS_COLLECTION).document(uid).get()
    return (snap.to_dict() if snap.exists else None)


def users_by_role(role: str) -> list[dict[str, Any]]:
    q = db.collection(USERS_COLLECTION).where(filter=FieldFilter("role", "==", role))
    return [{**(s.to_dict() or {}), "uid": s.id} for s in q.stream()]


def get_users_by_uids(uids: Iterable[str]) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    for uid in set(filter(None, uids)):
        p = get_user_profile(uid)
        if p:
            result[uid] = p
    return result
