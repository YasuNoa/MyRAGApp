from fastapi import APIRouter
from fastapi.responses import JSONResponse, RedirectResponse
from typing import Optional
from urllib.parse import quote
import os
import httpx
import logging
from firebase_admin import auth
from fastapi import HTTPException
from schemas.auth import LineAuthRequest, LineAuthResponse

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/.well-known/apple-app-site-association")
async def apple_app_site_association():
    """
    Apple Universal Links Configuration File
    Should be served over HTTPS with Content-Type: application/json
    """
    return JSONResponse(
        content={
            "applinks": {
                "apps": [],
                "details": [
                    {
                        "appID": "F2KY6KTH3H.com.yasu.jibunAI-ios", 
                        "paths": [
                            "/line-auth/*",
                            "/auth/*",
                            "/callback/*"
                        ]
                    }
                ]
            }
        },
        headers={
            "Content-Type": "application/json"
        }
    )

@router.get("/line-auth/callback")
async def line_auth_callback(
    code: str,
    state: str,
    friendship_status_changed: Optional[str] = None
):
    """
    Callback for LINE Login via Universal Link.
    Redirects back to the iOS app using Custom URL Scheme as a fallback/bridge.
    Scheme: com.yasu.jibunAI-ios://line-callback
    """
    # Redirect to the iOS app
    ios_scheme_url = f"com.yasu.jibunAI-ios://line-callback?code={quote(code)}&state={quote(state)}"
    return RedirectResponse(url=ios_scheme_url)

@router.post("/api/auth/line", response_model=LineAuthResponse)
async def line_auth(request: LineAuthRequest):
    """
    Exchange LINE Access Token for Firebase Custom Token.
    Validates LINE token, fetches profile, syncs user to Firebase (via admin SDK),
    and returns a Custom Token for client sign-in.
    """
    line_access_token = request.line_access_token
    
    if not line_access_token:
        raise HTTPException(status_code=400, detail="Access token is required")

    try:
        async with httpx.AsyncClient() as client:
            # 1. Verify Access Token with LINE
            verify_url = "https://api.line.me/oauth2/v2.1/verify"
            verify_res = await client.get(verify_url, params={"access_token": line_access_token})
            
            if verify_res.status_code != 200:
                logger.error(f"LINE Token Verify Error: Status={verify_res.status_code}") # Sanitized
                raise HTTPException(status_code=401, detail="Invalid access token")
            
            verify_data = verify_res.json()
            client_id = verify_data.get("client_id")
            
            # Verify Client ID
            env_line_id = os.getenv("AUTH_LINE_ID")
            if env_line_id and client_id != env_line_id:
                # Mask IDs in logs
                masked_client = f"{client_id[:4]}***" if client_id else "None"
                masked_env = f"{env_line_id[:4]}***" if env_line_id else "None"
                logger.error(f"LINE Client ID Mismatch: {masked_client} != {masked_env}")
                raise HTTPException(status_code=403, detail="Client ID mismatch") 

            # 2. Get User Profile from LINE
            profile_url = "https://api.line.me/v2/profile"
            profile_res = await client.get(profile_url, headers={"Authorization": f"Bearer {line_access_token}"})
            
            if profile_res.status_code != 200:
                logger.error(f"LINE Profile Error: Status={profile_res.status_code}") # Sanitized
                raise HTTPException(status_code=500, detail="Failed to get user profile")
            
            profile = profile_res.json()
            line_user_id = profile.get("userId")
            name = profile.get("displayName")
            picture = profile.get("pictureUrl")
            
            # 3. Create/Update Firebase User
            firebase_uid = f"line:{line_user_id}"
            
            try:
                auth.update_user(
                    firebase_uid,
                    display_name=name,
                    photo_url=picture
                )
            except auth.UserNotFoundError:
                auth.create_user(
                    uid=firebase_uid,
                    display_name=name,
                    photo_url=picture
                )
            
            # 4. Generate Custom Token
            # create_custom_token returns bytes in older versions or str? 
            # In python firebase-admin, it returns bytes (b'token'). Need to decode.
            custom_token_bytes = auth.create_custom_token(firebase_uid)
            custom_token = custom_token_bytes.decode("utf-8")
            
            return LineAuthResponse(firebase_token=custom_token)

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"LINE Login Internal Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
