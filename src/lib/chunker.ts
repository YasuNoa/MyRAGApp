/**
 * テキストを指定された文字数で分割する関数
 * @param text 分割対象のテキスト
 * @param chunkSize 1つのチャンクの最大文字数（デフォルト: 1000）
 * @param overlap チャンク間の重複文字数（デフォルト: 200）
 * @returns 分割されたテキストの配列
 */
export function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
    if (!text) return [];

    const chunks: string[] = [];
    let startIndex = 0;

    while (startIndex < text.length) {
        // 現在の開始位置から chunkSize 分だけ切り出す
        // ただし、テキストの末尾を超えないようにする
        const endIndex = Math.min(startIndex + chunkSize, text.length);
        const chunk = text.slice(startIndex, endIndex);

        chunks.push(chunk);

        // 次の開始位置を決める
        // 最後のチャンクだった場合はループを抜ける
        if (endIndex === text.length) {
            break;
        }

        // 重複分だけ戻って次の開始位置とする
        startIndex += chunkSize - overlap;
    }

    return chunks;
}
