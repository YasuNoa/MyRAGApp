import os
import logging
import firebase_admin
from firebase_admin import auth, credentials
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Any

logger = logging.getLogger(__name__)

# Initialize Firebase Admin SDK
# Try/Catch block to prevent error if already initialized (hot reload)
try:
    if not firebase_admin._apps:
        # Check for service account path env var, otherwise use default
        cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            logger.info(f"Firebase Admin initialized with credentials from: {cred_path}")
        else:
            # Fallback to Application Default Credentials
            firebase_admin.initialize_app()
            logger.info("Firebase Admin initialized with Application Default Credentials")
except Exception as e:
    logger.error(f"Failed to initialize Firebase Admin: {e}")

security = HTTPBearer()

async def get_current_user(token_auth: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """
    Validates the Firebase ID Token in the Authorization header.
    Returns the decoded token dictionary (claims).
    Expected header: Authorization: Bearer <token>
    """
    token = token_auth.credentials
    try:
        # Verify the ID token
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token.get("uid")
        
        if not uid:
             raise ValueError("No uid in token")

        # Return dict with uid (and other claims if needed)
        # ACQUIRE INTERNAL ID: Resolve Firebase UID -> Internal CUID
        from services.user_service import UserService
        internal_user_id = await UserService.resolve_user_id(uid)
        
        return {"uid": internal_user_id, "email": decoded_token.get("email"), "firebase_uid": uid}

    except auth.ExpiredIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except auth.InvalidIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )
