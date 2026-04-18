"""Firebase Admin SDK initialization.

Reads service account from `GOOGLE_APPLICATION_CREDENTIALS` env var
(default: `./.secrets/firebase-admin.json`).
"""
import os
from pathlib import Path

import firebase_admin
from firebase_admin import auth as fb_auth
from firebase_admin import credentials, firestore

_DEFAULT_KEY_PATH = Path(__file__).parent / ".secrets" / "firebase-admin.json"


def _initialize() -> firebase_admin.App:
    if firebase_admin._apps:
        return firebase_admin.get_app()

    key_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", str(_DEFAULT_KEY_PATH))
    if not Path(key_path).exists():
        raise FileNotFoundError(
            f"Firebase admin service account not found at '{key_path}'. "
            f"See backend/.secrets/README.md for setup instructions."
        )

    cred = credentials.Certificate(key_path)
    return firebase_admin.initialize_app(
        cred,
        {"projectId": os.getenv("FIREBASE_PROJECT_ID", "studysmart-hack")},
    )


app = _initialize()
db = firestore.client(app)

__all__ = ["app", "db", "fb_auth", "firestore"]
