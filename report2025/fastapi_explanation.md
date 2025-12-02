# FastAPI 完全解説：PythonでAPIを作るならこれ！

## 1. FastAPIとは？

FastAPIは、**「PythonでWeb APIを作るための、現代的で高速なフレームワーク」**です。

*   **Fast (速い)**: 動作がめちゃくちゃ速い（Node.jsやGo言語と並ぶレベル）。
*   **Fast (早い)**: コードを書く量が少なくて済み、開発スピードが上がる。

今、Python界隈でAPIを作ると言ったら、**「とりあえずFastAPI」**と言われるくらい大人気です。

---

## 2. なぜそんなに人気なの？（3つの推しポイント）

### ① 自動ドキュメント生成 (Swagger UI) 🌟最強機能
これがFastAPIを使う最大の理由です。
コードを書くだけで、**「APIの仕様書」と「テスト実行画面」が勝手に出来上がります。**

*   エンドポイントのURL
*   必要なパラメータ
*   データの型

これらを勝手に読み取って、ブラウザで見れる綺麗な画面を作ってくれます。
「ドキュメント書くの面倒くさい…」という悩みから解放されます。

### ② 型ヒント (Type Hints) による安全性
Pythonは本来、型（数字か文字かなど）を気にしない言語ですが、FastAPIは**「型」をフル活用**します。

```python
def get_item(item_id: int):  # item_idは「整数」だよ！と指定
    ...
```

こう書くだけで、もし文字が送られてきたら「数字じゃないよ！」と自動でエラーを返してくれます。
バグが激減し、エディタ（VS Codeなど）の補完もバリバリ効きます。

### ③ 非同期処理 (Async)
Node.jsと同じように、`async / await` を使って、たくさんのリクエストを同時に捌くことができます。
AIの処理待ちなど、時間がかかる処理があってもサーバーが止まりません。

---

## 3. Next.js API Route との使い分け

「Next.jsでもAPI作れるじゃん。どっち使えばいいの？」という疑問への答えです。

| 特徴 | Next.js (Node.js) | FastAPI (Python) |
| :--- | :--- | :--- |
| **得意分野** | Webアプリのバックエンド全般 | **AI、機械学習、データ分析** |
| **言語** | TypeScript / JavaScript | Python |
| **ライブラリ** | Web系が豊富 | **AI系 (PyTorch, Pandas) が最強** |
| **おすすめ** | 普通のWebサービスを作る時 | **AI機能を組み込みたい時** |

**結論**:
*   普通のWebアプリなら **Next.js** だけでOK。
*   「Gemini以外の、Pythonでしか動かないAIモデルを使いたい」とかなら **FastAPI**。

---

## 4. 実装例：Hello World

Pythonのコードはこんな感じです。

```python
from fastapi import FastAPI

# アプリの作成
app = FastAPI()

# デコレータ: 「/」にアクセスが来たら、この関数を動かしてね
@app.get("/")
async function root():
    return {"message": "Hello World"}

# パラメータを受け取る例: /items/5?q=somequery
@app.get("/items/{item_id}")
async function read_item(item_id: int, q: str | None = None):
    return {"item_id": item_id, "q": q}
```

### Next.js との違い
*   **デコレータ (`@app.get`)**: 関数の上に「これはGETだよ」とシールを貼るような書き方をします。
*   **関数の引数**: URLのパラメータが、そのまま関数の引数 (`item_id`) になります。直感的！

---

## まとめ

FastAPIは、**「Pythonの書きやすさ」**と**「最新のWeb技術」**を合体させた、非常に優れたフレームワークです。
特に**「勝手にドキュメントができる」**機能は、一度体験すると戻れません。

もし将来、Pythonで自作のAIモデルを動かすAPIを作りたくなったら、迷わずFastAPIを選んでください！
