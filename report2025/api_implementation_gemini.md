# API実装実践ガイド：Geminiと会話しよう

このガイドでは、**「ユーザーの入力を受け取り、Geminiに投げて、返事を返す」** という実際のAPIをどう作るか、コードの1行1行の意味も含めて解説します。

---

## 1. 作るものの設計図

*   **エンドポイント (URL)**: `/api/gemini`
*   **メソッド**: `POST` (データを受け取るので)
*   **流れ**:
    1.  フロントエンドから「こんにちは」というテキストが届く。
    2.  APIがそれを受け取る (荷解き)。
    3.  APIがGeminiに「これに返事して」と頼む。
    4.  Geminiからの返事を、フロントエンドに送り返す (梱包)。

---

## 2. 準備 (セットアップ)

まず、Geminiと話すための道具（SDK）をインストールします。
ターミナルで実行するコマンドです：

```bash
npm install @google/generative-ai
```

そして、`.env` ファイルにAPIキーを設定しておきます。
```env
GEMINI_API_KEY=あなたのAPIキー
```

---

## 3. バックエンドの実装 (API)

ファイル: `app/api/gemini/route.ts`

このコードをコピペすれば動きますが、大事なのは**「なぜこう書くのか」**です。

```typescript
import { NextResponse } from 'next/server'; // レスポンスを返すための道具
import { GoogleGenerativeAI } from '@google/generative-ai'; // Geminiを使うための道具

// POSTリクエストを受け取る関数
// 「async」は「時間がかかる処理があるよ」という合図
export async function POST(req: Request) {
  try {
    // --- 1. 荷解き (リクエストの解析) ---
    
    // 送られてきたデータ(JSON)を取り出します
    // awaitは「取り出し終わるまで待って！」という意味
    const body = await req.json();
    
    // 中身から "message" という名前のデータを取り出します
    const userMessage = body.message;

    // もしメッセージが空っぽだったら、「ダメだよ」と返します
    if (!userMessage) {
      return NextResponse.json(
        { error: 'メッセージ送ってくれないと困るよ' },
        { status: 400 } // 400は「あなたのリクエストが悪い」というエラーコード
      );
    }

    // --- 2. Geminiへの依頼 ---

    // Geminiを使う準備 (APIキーを渡す)
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    
    // 使うモデルを選ぶ (gemini-proなど)
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // Geminiに質問を投げる
    // ここも時間がかかるので await で待ちます
    const result = await model.generateContent(userMessage);
    
    // 返ってきた結果から、テキスト部分だけを取り出す
    const responseText = result.response.text();

    // --- 3. 梱包と返送 (レスポンス) ---

    // JSON形式に包んで返します
    return NextResponse.json({
      reply: responseText
    });

  } catch (error) {
    // --- 4. エラー処理 (もしもの時) ---
    
    // 何か予期せぬエラーが起きたら、ここに来ます
    console.error('エラー発生:', error);
    
    return NextResponse.json(
      { error: 'ごめん、サーバーで何かエラー起きたわ' },
      { status: 500 } // 500は「サーバーが悪い」というエラーコード
    );
  }
}
```

### 💡 仕組みのポイント解説

1.  **`req.json()`**:
    *   インターネットを通ってくるデータは、文字列の塊（JSON文字列）になっています。
    *   これをプログラムで扱える「オブジェクト」という形に変換（パース）するのがこの関数です。

2.  **`await` (アウェイト)**:
    *   API通信やAIの生成は、一瞬では終わりません（数秒かかる）。
    *   `await` を書かないと、**「結果がまだ届いていないのに、次の行に進んでしまう」**ことになります。
    *   「結果が来るまでここで待機してね」と伝える重要なキーワードです。

3.  **`try-catch` (トライ・キャッチ)**:
    *   APIキーが間違っていたり、ネットが切れていたりすると、プログラムはクラッシュ（停止）します。
    *   `try { ... }` の中でエラーが起きても、クラッシュさせずに `catch { ... }` にジャンプさせる仕組みです。
    *   これのおかげで、ユーザーに「エラー起きたよ」と優しく伝えることができます。

---

## 4. フロントエンドからの呼び出し方 (おまけ)

作ったAPIを、画面（Reactコンポーネント）からどう使うかも見てみましょう。

```typescript
// ボタンを押した時の処理
const handleSend = async () => {
  // 1. APIに手紙を送る (fetch)
  const response = await fetch('/api/gemini', {
    method: 'POST', // 「送るよ！」
    headers: {
      'Content-Type': 'application/json', // 「中身はJSONだよ！」
    },
    body: JSON.stringify({ message: 'こんにちは' }), // データを文字にして送る
  });

  // 2. 返事を受け取る
  const data = await response.json();
  
  // 3. 画面に表示する
  console.log(data.reply); // -> "こんにちは！何かお手伝いしましょうか？"
};
```

これがAPI実装の全体像です！
「受け取って(req)、処理して(Gemini)、返す(res)」という基本の流れは、どんな複雑なAPIでも同じです。
