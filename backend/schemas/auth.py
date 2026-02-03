from schemas.common import CamelModel

class LineAuthRequest(CamelModel):
    line_access_token: str

class LineAuthResponse(CamelModel):
    firebase_token: str
