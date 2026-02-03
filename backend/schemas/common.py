

import re
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

class CamelModel(BaseModel):
    """
    Base model that handles auto-conversion between camelCase (JSON) and snake_case (Python).
    Example:
        class User(CamelModel):
            user_id: str
        
        # JSON: {"userId": "123"} -> Python: user.user_id == "123"
        # Python: User(user_id="123").model_dump(by_alias=True) -> {"userId": "123"}
    """
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )

def clean_json_response(text: str) -> str:
    """Markdownのコードブロックを除去してJSON文字列を抽出する"""
    # ```json ... ``` or ``` ... ``` を除去
    text = re.sub(r'^```json\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'^```\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'\s*```$', '', text, flags=re.MULTILINE)
    return text.strip()

class ErrorResponse(CamelModel):
    detail: str
