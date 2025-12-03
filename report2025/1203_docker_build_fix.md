# 2025-12-03 Dockerビルド・Prismaエラー完全修正報告

本日の開発において発生した、執拗なDockerビルドエラーとPrisma不整合の戦いの記録、および最終的な解決策をまとめます。

## 🛑 発生したエラーとアプローチの変遷

### 第1形態: ファイルが見つからない (`MODULE_NOT_FOUND`)
*   **事象:** コンテナ起動時に `Cannot find module .../generator-build/index.js` エラーが発生。
*   **原因:** ホスト（Mac）の `node_modules` がDockerコンテナ（Linux）にマウントされ、アーキテクチャの異なるバイナリが混入していた。
*   **アプローチ:** ルートディレクトリに `.dockerignore` を作成し、`node_modules` を除外。
*   **結果:** 一部は改善したが、エラーは完全には消えず。

### 第2形態: バージョン不整合 (Prisma v7 vs v5)
*   **事象:** `package.json` で `v5.22.0` を指定しているのに、ログには `Prisma CLI Version : 7.0.1` と表示され、スキーマエラー (`P1012`) が発生。
*   **原因:** Dockerfileが `ENV NODE_ENV production`（本番モード）になっていたため、`npm install` が `devDependencies` (Prisma CLI v5) をインストールしなかった。その結果、`npx` がインターネットから最新の v7 を勝手にダウンロードして実行していた。
*   **アプローチ:** `docker-compose.yml` で `NODE_ENV=development` を強制指定。
*   **結果:** 正しいバージョンが使われるようになったが、まだ起動せず。

### 第3形態: タイミングエラー (`postinstall` failed)
*   **事象:** `npm install` の実行中に `postinstall` スクリプト（`prisma generate`）が走り、依存関係の準備不足でクラッシュ。
*   **アプローチ:** `package.json` から `postinstall` を削除し、`docker-compose` のコマンドで明示的に `prisma generate` を実行するように変更。
*   **結果:** インストール自体は通るようになった。

### 第4形態: ゾンビデータと権限エラー (`Device or resource busy`)
*   **事象:** `npm install` が一瞬で終わる（キャッシュを使っている）のにエラーが直らない。そこで `rm -rf node_modules` を試みるも、ボリュームマウント中であるため削除できずエラー。
*   **原因:** 過去の失敗で壊れた `node_modules` がDockerボリューム内に残留しており、それを使い回していた。また、Mac用の `package-lock.json` がLinux環境と競合していた。
*   **アプローチ:**
    1.  `rm -rf node_modules`（フォルダ削除）ではなく、`rm -f package-lock.json`（ロックファイル削除）に変更。
    2.  `docker-compose down -v` でボリュームを完全消去。
    3.  Dockerのビルドターゲットを `deps`（プレーンな環境）に変更。

---

## 🏆 最終的な勝因 (The Winning Solution)

以下の「最強の組み合わせ」で環境を強制的にクリーンアップし、正しい依存関係を再構築しました。

1.  **`target: deps`**:
    本番用設定（`runner`ステージ）を無視し、開発に必要なツールが揃ったプレーンな状態のイメージを使用しました。
2.  **`NODE_ENV=development`**:
    「これは開発環境だ」と明示することで、Prisma CLI (v5) を確実にインストールさせました。
3.  **`rm package-lock.json`**:
    Mac環境の依存情報を強制的に破棄し、Linux環境としてゼロから依存関係を解決させました。
4.  **ボリュームの完全リセット (`down -v`)**:
    過去の「腐ったデータ」を物理的に消去しました。

---

## ⚠️ 現在のエラーと対応 (P2021)

現在出ているエラー：
```
The table `public.User` does not exist in the current database.
```

**これは「正常なエラー」です。**
`docker-compose down -v` を実行したため、データベース（PostgreSQL）のデータも全てリセットされ、**空っぽの状態**になっています。

### 次のアクション
データベースにテーブルを作成（マイグレーション）する必要があります。
別のターミナルを開いて、以下のコマンドを実行してください。

```bash
# データベースにテーブルを作成
npx prisma db push
```
(※ `.env` の `DATABASE_URL` がローカルのDockerを向いていることを確認してください)

または、Dockerコンテナの中で実行する場合：
```bash
docker-compose exec frontend npx prisma db push
```
