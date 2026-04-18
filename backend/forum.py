"""Forum API backed by Firestore. AI replies generated in background via Gemini."""
import os

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from google import genai
from pydantic import BaseModel

import firestore_repo as repo
from auth import optional_current_user


router = APIRouter(prefix="/api/forum", tags=["forum"])


class PostCreate(BaseModel):
    title: str
    content: str


class ReplyCreate(BaseModel):
    content: str


def _generate_ai_reply(question_title: str, question_content: str, post_id: str) -> None:
    """Generate a bot reply using Gemini and append to the post."""
    try:
        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not api_key:
            print("WARNING: GEMINI_API_KEY not found. Skipping AI reply generation.")
            return

        client = genai.Client(api_key=api_key)

        prompt = f"""You are a helpful teaching assistant. A student has asked the following question in a course forum:

Title: {question_title}

Question: {question_content}

Please provide a clear, educational, and helpful answer. Keep it concise but thorough. If the question is unclear, ask for clarification. Format your response in a friendly, supportive tone."""

        models_to_try = ["gemini-2.5-flash", "gemini-3-flash-preview"]
        reply_content = None
        for model in models_to_try:
            try:
                response = client.models.generate_content(model=model, contents=prompt)
                reply_content = response.text
                break
            except Exception as e:
                print(f"Model {model} failed: {e}")
                continue

        if not reply_content:
            print("All models failed for AI reply generation")
            return

        repo.add_reply(
            post_id,
            content=reply_content,
            author="AI Assistant",
            author_type="bot",
        )
        print(f"AI reply added to post {post_id}")
    except Exception as e:
        print(f"Error generating AI reply: {e}")


@router.get("/posts")
async def get_posts():
    return {"posts": repo.list_posts()}


@router.get("/posts/{post_id}")
async def get_post(post_id: str):
    post = repo.get_post(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@router.post("/posts")
async def create_post(
    post: PostCreate,
    background_tasks: BackgroundTasks,
    user=Depends(optional_current_user),
):
    author_name = "Anonymous"
    author_type = "student"
    author_uid = None
    if user:
        author_name = user.get("displayName") or user.get("email") or "User"
        author_type = user.get("role") or "student"
        author_uid = user.get("uid")

    created = repo.create_post(
        title=post.title,
        content=post.content,
        author=author_name,
        author_type=author_type,
        author_uid=author_uid,
    )

    repo.log_event(
        event_type="forum_post",
        uid=author_uid,
        role=author_type,
        metadata={"postId": created["id"], "title": post.title, "target": post.title},
    )

    background_tasks.add_task(_generate_ai_reply, post.title, post.content, created["id"])
    return created


@router.post("/posts/{post_id}/reply")
async def add_reply(
    post_id: str,
    reply: ReplyCreate,
    user=Depends(optional_current_user),
):
    author_name = "Anonymous"
    author_type = "student"
    author_uid = None
    if user:
        author_name = user.get("displayName") or user.get("email") or "User"
        author_type = user.get("role") or "student"
        author_uid = user.get("uid")

    added = repo.add_reply(
        post_id,
        content=reply.content,
        author=author_name,
        author_type=author_type,
        author_uid=author_uid,
    )
    if not added:
        raise HTTPException(status_code=404, detail="Post not found")

    post = repo.get_post(post_id)
    repo.log_event(
        event_type="forum_reply",
        uid=author_uid,
        role=author_type,
        metadata={
            "postId": post_id,
            "title": (post or {}).get("title", ""),
            "target": (post or {}).get("title", ""),
        },
    )

    return {"message": "Reply added successfully", "reply": added}
