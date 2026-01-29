from fastapi import APIRouter
from fastapi import APIRouter
from . import voice, auth, user, chat, knowledge, course, feedback

# -------------------------------------------------------------------------
# Router Aggregator
# -------------------------------------------------------------------------
# 責務: 全てのサブ・ルーターを集約し、main.py に提供する。
# これにより main.py は個別のルーターを知る必要がなくなる。
# -------------------------------------------------------------------------

router = APIRouter()

# --- Legacy Ask Router ---
# 元の main.py: app.include_router(ask.router)
# ask.router has been removed.
# router.include_router(ask.router)

# --- Voice Processing ---
# 元の main.py: app.include_router(voice.router, prefix="/voice")
router.include_router(voice.router, prefix="/api/voice", tags=["Voice"])

# --- Authentication ---
# 元の main.py: app.include_router(auth.router)
# Note: Auth router contains /.well-known which MUST be at root.
router.include_router(auth.router, tags=["Auth"])

# --- User Management ---
# 元の main.py: app.include_router(user.router, prefix="/api")
router.include_router(user.router, prefix="/api", tags=["User"])

# --- Chat Functionality ---
router.include_router(chat.router, prefix="/api", tags=["Chat"])

# --- Course Management ---
router.include_router(course.router, prefix="/api", tags=["Course"])

# --- Knowledge & File Import ---
# 元の main.py: app.include_router(knowledge.router)
# Moved to /api/knowledge prefix
router.include_router(knowledge.router, prefix="/api/knowledge", tags=["Knowledge"])

# --- Feedback ---
router.include_router(feedback.router, prefix="/api/feedback", tags=["Feedback"])
