from fastapi import APIRouter
from fastapi.responses import JSONResponse, RedirectResponse
from typing import Optional

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
    ios_scheme_url = f"com.yasu.jibunAI-ios://line-callback?code={code}&state={state}"
    return RedirectResponse(url=ios_scheme_url)
