
import re

def clean_json_response(text: str) -> str:
    """Markdownのコードブロックを除去してJSON文字列を抽出する"""
    # ```json ... ``` or ``` ... ``` を除去
    text = re.sub(r'^```json\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'^```\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'\s*```$', '', text, flags=re.MULTILINE)
    return text.strip()
