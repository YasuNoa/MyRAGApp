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
router.include_router(voice.router, prefix="/voice", tags=["Voice"])

# --- Authentication ---
# 元の main.py: app.include_router(auth.router)
router.include_router(auth.router, tags=["Auth"])

# --- User Management ---
# 元の main.py: app.include_router(user.router, prefix="/api")
router.include_router(user.router, prefix="/api", tags=["User"])

# --- Chat Functionality ---
# 元の main.py: app.include_router(chat.router, prefix="/api")
# Note: chat.router likely contains /chat or /ask related endpoints under /api
router.include_router(chat.router, prefix="/api", tags=["Chat"])

# --- Course Management ---
router.include_router(course.router, prefix="/api", tags=["Course"])

# --- Knowledge & File Import ---
# 元の main.py: app.include_router(knowledge.router)
# /import-file, etc. -> Root level for legacy compat
router.include_router(knowledge.router, tags=["Knowledge"])

# --- Feedback ---
router.include_router(feedback.router, prefix="/api/feedback", tags=["Feedback"])
