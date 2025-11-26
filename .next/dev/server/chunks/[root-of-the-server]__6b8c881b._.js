module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/fs [external] (fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}),
"[externals]/path [external] (path, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("path", () => require("path"));

module.exports = mod;
}),
"[externals]/os [external] (os, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("os", () => require("os"));

module.exports = mod;
}),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[project]/src/lib/gemini.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Googleの生成AI（Gemini）を利用するためのライブラリをインポートします。
__turbopack_context__.s([
    "classifyIntent",
    ()=>classifyIntent,
    "generateAnswer",
    ()=>generateAnswer,
    "getEmbedding",
    ()=>getEmbedding
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$google$2f$generative$2d$ai$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@google/generative-ai/dist/index.mjs [app-route] (ecmascript)");
// 環境変数を読み込むためのライブラリです。
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$dotenv$2f$lib$2f$main$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/dotenv/lib/main.js [app-route] (ecmascript)");
;
;
// .envファイルの設定を読み込みます。
__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$dotenv$2f$lib$2f$main$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].config();
// 環境変数からGoogleのAPIキーを取得します。
const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
    console.warn("GOOGLE_API_KEY is not set in .env file");
}
// Geminiのクライアントを初期化します。
// これを使って、Geminiのモデル（AI）にアクセスします。
const genAI = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$google$2f$generative$2d$ai$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["GoogleGenerativeAI"](apiKey || "");
async function getEmbedding(text) {
    // "text-embedding-004" という、ベクトル化専用のモデルを使います。
    const model = genAI.getGenerativeModel({
        model: "text-embedding-004"
    });
    // テキストを渡して、ベクトルデータを取得します。
    const result = await model.embedContent(text);
    // 結果の中から、数値の配列（values）だけを取り出して返します。
    return result.embedding.values;
}
async function classifyIntent(text) {
    const model = genAI.getGenerativeModel({
        model: "gemini-pro"
    });
    const prompt = `
    あなたはユーザーの意図を分類するAIです。
    以下のテキストが「知識として覚えるべき情報」なのか、「何かを尋ねている質問」なのかを判断してください。
    
    テキスト: "${text}"
    
    出力は以下のいずれかのみを返してください。余計な文字は一切含めないでください。
    - STORE (情報の入力、知識の追加、宣言文など)
    - SEARCH (質問、検索、挨拶、会話など)
    `;
    const result = await model.generateContent(prompt);
    const response = result.response;
    const intent = response.text().trim().toUpperCase();
    if (intent.includes("STORE")) return "STORE";
    return "SEARCH";
}
async function generateAnswer(query, context) {
    // "gemini-flash-latest" という、高速で安価なモデルを使います。
    // 用途に応じて "gemini-pro" などに変更することも可能です。
    const model = genAI.getGenerativeModel({
        model: "gemini-flash-latest"
    });
    // AIへの命令文（プロンプト）を作成します。
    // ここで「コンテキスト」と「質問」をセットで渡すのがポイントです。
    const prompt = `
  あなたは親切なアシスタントです。以下のコンテキストを使用して、ユーザーの質問に答えてください。
  答えがコンテキストにない場合は、「提供された情報からはわかりません」と答えてください。
  
  コンテキスト:
  ${context.join("\n\n")}
  
  質問:
  ${query}
  `;
    // プロンプトをAIに送信し、回答を生成させます。
    const result = await model.generateContent(prompt);
    // 生成されたテキストを返します。
    return result.response.text();
}
}),
"[externals]/node:stream [external] (node:stream, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:stream", () => require("node:stream"));

module.exports = mod;
}),
"[project]/src/lib/pinecone.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Pineconeのクライアントライブラリをインポートします。
// これを使うことで、PineconeのAPIを簡単に呼び出すことができます。
__turbopack_context__.s([
    "queryDocuments",
    ()=>queryDocuments,
    "upsertDocument",
    ()=>upsertDocument
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$pinecone$2d$database$2f$pinecone$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@pinecone-database/pinecone/dist/index.js [app-route] (ecmascript)");
// 環境変数（.envファイル）を読み込むためのライブラリです。
// APIキーなどの機密情報はコードに直接書かず、環境変数として管理するのがセキュリティの基本です。
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$dotenv$2f$lib$2f$main$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/dotenv/lib/main.js [app-route] (ecmascript)");
;
;
// .envファイルの内容を process.env に読み込みます。
__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$dotenv$2f$lib$2f$main$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].config();
// 環境変数からPineconeのAPIキーとインデックス名（DB名）を取得します。
const apiKey = process.env.PINECONE_API_KEY;
const indexName = process.env.PINECONE_INDEX;
// もしAPIキーが設定されていなければ、警告を出します。
// これがないと、接続エラーの原因がわからずデバッグに苦労するためです。
if (!apiKey) {
    console.warn("PINECONE_API_KEY is not set in .env file");
}
// Pineconeのクライアントを初期化します。
// ここでAPIキーを渡すことで、クラウド上のPineconeサービスと認証を行います。
// これ以降、この `pc` オブジェクトを使ってデータベース操作を行います。
const pc = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$pinecone$2d$database$2f$pinecone$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Pinecone"]({
    apiKey: apiKey || ""
});
// 使用するインデックス（データベース）を指定します。
// インデックスは事前にPineconeの管理画面で作成しておく必要があります。
// ここでは .env で指定された名前（なければ "quickstart"）のインデックスに接続します。
const index = pc.index(indexName || "quickstart");
async function upsertDocument(id, text, vector) {
    // index.upsert() を使ってデータを保存します。
    // Pineconeには、ID、ベクトル(values)、メタデータ(metadata)をセットで保存できます。
    await index.upsert([
        {
            id: id,
            values: vector,
            metadata: {
                text
            }
        }
    ]);
}
async function queryDocuments(vector, topK = 3) {
    // index.query() を使って、渡されたベクトルに近いデータを検索します。
    const queryResponse = await index.query({
        vector: vector,
        topK: topK,
        includeMetadata: true
    });
    // 検索結果から、元のテキストだけを取り出して配列として返します。
    // match.metadata?.text が存在するものだけをフィルタリングしています。
    return queryResponse.matches.map((match)=>match.metadata?.text).filter((text)=>text !== undefined);
}
}),
"[externals]/util [external] (util, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("util", () => require("util"));

module.exports = mod;
}),
"[externals]/stream [external] (stream, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("stream", () => require("stream"));

module.exports = mod;
}),
"[externals]/http [external] (http, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("http", () => require("http"));

module.exports = mod;
}),
"[externals]/https [external] (https, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("https", () => require("https"));

module.exports = mod;
}),
"[externals]/url [external] (url, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("url", () => require("url"));

module.exports = mod;
}),
"[externals]/http2 [external] (http2, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("http2", () => require("http2"));

module.exports = mod;
}),
"[externals]/assert [external] (assert, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("assert", () => require("assert"));

module.exports = mod;
}),
"[externals]/zlib [external] (zlib, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("zlib", () => require("zlib"));

module.exports = mod;
}),
"[externals]/events [external] (events, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("events", () => require("events"));

module.exports = mod;
}),
"[externals]/node:buffer [external] (node:buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}),
"[project]/src/lib/line.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "lineClient",
    ()=>lineClient,
    "lineConfig",
    ()=>lineConfig,
    "replyMessage",
    ()=>replyMessage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$line$2f$bot$2d$sdk$2f$dist$2f$client$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__default__as__Client$3e$__ = __turbopack_context__.i("[project]/node_modules/@line/bot-sdk/dist/client.js [app-route] (ecmascript) <export default as Client>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$dotenv$2f$lib$2f$main$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/dotenv/lib/main.js [app-route] (ecmascript)");
;
;
__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$dotenv$2f$lib$2f$main$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].config();
const config = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
    channelSecret: process.env.LINE_CHANNEL_SECRET || ""
};
const lineClient = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$line$2f$bot$2d$sdk$2f$dist$2f$client$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__default__as__Client$3e$__["Client"]({
    channelAccessToken: config.channelAccessToken || "",
    channelSecret: config.channelSecret
});
const lineConfig = config;
async function replyMessage(replyToken, text) {
    await lineClient.replyMessage(replyToken, {
        type: "text",
        text: text
    });
}
}),
"[externals]/node:crypto [external] (node:crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:crypto", () => require("node:crypto"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

module.exports = mod;
}),
"[project]/auth.config.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "authConfig",
    ()=>authConfig
]);
const authConfig = {
    pages: {
        signIn: "/login"
    },
    callbacks: {
        async signIn ({ account, profile }) {
            if (account?.provider === "line") {
                if (!profile?.email) {
                    return "/login?error=EmailRequired";
                }
            }
            return true;
        },
        authorized ({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnDashboard = nextUrl.pathname.startsWith("/");
            const isOnLogin = nextUrl.pathname.startsWith("/login");
            const isOnRegister = nextUrl.pathname.startsWith("/register");
            if (isOnDashboard) {
                // ログイン画面と登録画面は誰でもアクセスOK
                if (isOnLogin || isOnRegister) return true;
            // その他のページはログイン必須
            // if (isLoggedIn) return true;
            // return false; // Redirect unauthenticated users to login page
            }
            return true;
        }
    },
    providers: []
};
}),
"[externals]/@prisma/client [external] (@prisma/client, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("@prisma/client", () => require("@prisma/client"));

module.exports = mod;
}),
"[project]/src/lib/prisma.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "prisma",
    ()=>prisma
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/@prisma/client [external] (@prisma/client, cjs)");
;
const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma || new __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$29$__["PrismaClient"]();
if ("TURBOPACK compile-time truthy", 1) globalForPrisma.prisma = prisma;
}),
"[project]/auth.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "auth",
    ()=>auth,
    "handlers",
    ()=>handlers,
    "signIn",
    ()=>signIn,
    "signOut",
    ()=>signOut
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next-auth/index.js [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$providers$2f$credentials$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next-auth/providers/credentials.js [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$providers$2f$credentials$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@auth/core/providers/credentials.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$auth$2e$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/auth.config.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$bcryptjs$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/bcryptjs/index.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$providers$2f$line$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next-auth/providers/line.js [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$providers$2f$line$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@auth/core/providers/line.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$prisma$2d$adapter$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@auth/prisma-adapter/index.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/prisma.ts [app-route] (ecmascript)");
;
;
;
;
;
;
;
const { handlers, signIn, signOut, auth } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"])({
    ...__TURBOPACK__imported__module__$5b$project$5d2f$auth$2e$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["authConfig"],
    adapter: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$prisma$2d$adapter$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PrismaAdapter"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"]),
    session: {
        strategy: "jwt"
    },
    providers: [
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$providers$2f$line$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"])({
            clientId: process.env.AUTH_LINE_ID,
            clientSecret: process.env.AUTH_LINE_SECRET,
            authorization: {
                params: {
                    scope: "openid profile email"
                }
            },
            allowDangerousEmailAccountLinking: true
        }),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$providers$2f$credentials$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"])({
            credentials: {
                username: {
                    label: "Phone Number",
                    type: "text"
                },
                password: {
                    label: "Password",
                    type: "password"
                }
            },
            authorize: async (credentials)=>{
                if (!credentials?.username || !credentials?.password) return null;
                const user = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].user.findUnique({
                    where: {
                        phoneNumber: credentials.username
                    }
                });
                if (!user || !user.password) {
                    return null;
                }
                const isValid = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$bcryptjs$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].compare(credentials.password, user.password);
                if (isValid) {
                    return {
                        id: user.id,
                        name: user.name,
                        email: user.email
                    };
                }
                return null;
            }
        })
    ]
});
}),
"[project]/src/index.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// HonoのサーバーをNode.js環境で動かすためのアダプターをインポートします。
// これがないと、Honoで作ったアプリを通常のNode.jsサーバーとして起動できません。
// import { serve } from "@hono/node-server"; // src/server.ts に移動
// Webフレームワーク「Hono」本体をインポートします。
// Honoは軽量で高速なWebフレームワークで、APIサーバーを作るのに適しています。
__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$hono$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/hono/dist/index.js [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$hono$2f$dist$2f$hono$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/hono/dist/hono.js [app-route] (ecmascript)");
// Gemini（AI）を操作するための自作関数をインポートします。
// getEmbedding: テキストをベクトル（数値の羅列）に変換する関数
// generateAnswer: 検索結果を元にAIに回答を生成させる関数
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$gemini$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/gemini.ts [app-route] (ecmascript)");
// Pinecone（ベクトルデータベース）を操作するための自作関数をインポートします。
// upsertDocument: ベクトルデータを保存・更新する関数
// queryDocuments: 類似するベクトルを検索する関数
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$pinecone$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/pinecone.ts [app-route] (ecmascript)");
// LINE Bot関連の機能をインポートします。
// lineConfig: LINEの設定情報
// lineClient: LINE APIを叩くためのクライアント
// replyMessage: ユーザーに返信を送るための関数
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$line$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/line.ts [app-route] (ecmascript)");
// 一意なID（UUID）を生成するためのライブラリです。
// データベースに保存する際、ドキュメントごとに重複しないIDを付けるために使います。
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$uuid$2f$dist$2d$node$2f$v4$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__default__as__v4$3e$__ = __turbopack_context__.i("[project]/node_modules/uuid/dist-node/v4.js [app-route] (ecmascript) <export default as v4>");
var __TURBOPACK__imported__module__$5b$project$5d2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/auth.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/prisma.ts [app-route] (ecmascript)");
;
;
;
;
;
;
;
// Honoアプリのインスタンスを作成します。
// これがサーバーの本体となり、ここにルート（URLごとの処理）を追加していきます。
const app = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$hono$2f$dist$2f$hono$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Hono"]().basePath("/api");
// データを保存するAPIエンドポイントを定義します。
// HTTPメソッドは「POST」を使います（データの作成・追加はPOSTが一般的だからです）。
// URLは "/add" です。
// なぜこれが必要か？: ユーザーがチャットボットに知識を追加できるようにするためです。
app.post("/add", async (c)=>{
    // リクエストボディからJSONデータを取得し、その中の "text" プロパティを取り出します。
    // awaitが必要なのは、ネットワーク経由でデータを受け取る処理が非同期だからです。
    const { text } = await c.req.json();
    // もし text が空っぽだったら、エラーを返します。
    // 400 は "Bad Request"（リクエストが不正）という意味のステータスコードです。
    if (!text) return c.json({
        error: "Text is required"
    }, 400);
    try {
        // 処理が始まったことをログに出力します（デバッグ用）。
        console.log(`[保存中] テキスト: ${text}`);
        // 1. テキストをベクトル化（数値化）します。
        // AIは言葉を直接理解できないので、意味を表す数値のリストに変換する必要があります。
        const vector = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$gemini$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getEmbedding"])(text);
        // 2. Pinecone（データベース）に保存します。
        // 保存には一意なIDが必要なので、uuidv4() でランダムなIDを生成します。
        const id = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$uuid$2f$dist$2d$node$2f$v4$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__default__as__v4$3e$__["v4"])();
        // ID、元のテキスト、そしてベクトルデータの3つをセットで保存します。
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$pinecone$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["upsertDocument"])(id, text, vector);
        // 保存が成功したことをログに出力します。
        console.log(`[完了] ID: ${id} で保存しました。`);
        // クライアント（呼び出し元）に成功したことと、生成されたIDをJSONで返します。
        return c.json({
            success: true,
            id
        });
    } catch (e) {
        // もし途中でエラーが発生した場合（API制限やDB接続エラーなど）はここに来ます。
        console.error(e);
        // 500 は "Internal Server Error"（サーバー内部エラー）という意味です。
        return c.json({
            error: "Failed to add document"
        }, 500);
    }
});
// 質問を受け付けて回答するAPIエンドポイントを定義します。
// ここでもデータの送信を伴うので「POST」を使います。
// URLは "/ask" です。
app.post("/ask", async (c)=>{
    const session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["auth"])();
    if (!session || !session.user?.id) {
        return c.json({
            error: "Unauthorized"
        }, 401);
    }
    const userId = session.user.id;
    const { query } = await c.req.json();
    if (!query) return c.json({
        error: "Query is required"
    }, 400);
    try {
        console.log(`[検索中] 質問: ${query}`);
        // 1. ユーザーのメッセージをDBに保存
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].message.create({
            data: {
                content: query,
                role: "user",
                userId: userId
            }
        });
        // 2. ベクトル化 & 検索
        const vector = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$gemini$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getEmbedding"])(query);
        const context = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$pinecone$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["queryDocuments"])(vector);
        // 3. 回答生成
        const answer = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$gemini$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["generateAnswer"])(query, context);
        // 4. AIの回答をDBに保存
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].message.create({
            data: {
                content: answer,
                role: "assistant",
                userId: userId
            }
        });
        console.log(`[回答] ${answer}`);
        return c.json({
            answer,
            context
        });
    } catch (e) {
        console.error(e);
        return c.json({
            error: "Failed to get answer"
        }, 500);
    }
});
// LINEからのWebhookを受け取るエンドポイントです。
// LINE Botにメッセージが送られると、LINEのサーバーからこのURLに通知が来ます。
app.post("/webhook/line", async (c)=>{
    // LINEからのリクエストには、改ざん防止のための署名（signature）が付いています。
    const signature = c.req.header("x-line-signature");
    // 署名がないリクエストは不正とみなしてエラーにします。
    if (!signature) return c.json({
        error: "Signature missing"
    }, 400);
    // リクエストの本文（body）をテキストとして取得します。
    const body = await c.req.text();
    // 本来はここで署名の検証（verify）を行うべきですが、現在は実装されていません。
    // 本番環境では @line/bot-sdk の middleware を使うか、手動で検証ロジックを書く必要があります。
    // 現状は「署名があるか」のチェックのみで、中身の正当性はチェックしていないことに注意してください。
    // LINEからのイベントデータ（メッセージ受信など）を取り出します。
    const events = JSON.parse(body).events;
    // 届いたイベントを1つずつ処理します
    for (const event of events){
        if (event.type === "message" && event.message.type === "text") {
            const userMessage = event.message.text;
            const replyToken = event.replyToken;
            const lineUserId = event.source.userId; // LINEのユーザーID
            console.log(`[LINE] 受信: ${userMessage} (from ${lineUserId})`);
            try {
                // 1. LINE IDからアプリのユーザーIDを特定する
                const account = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].account.findFirst({
                    where: {
                        provider: "line",
                        providerAccountId: lineUserId
                    }
                });
                // ユーザーが見つからない場合は、とりあえずログだけ出して処理続行（またはエラー返信）
                // ここでは「ゲスト」として扱うか、エラーにするか迷いますが、一旦保存せずに進めます。
                const userId = account?.userId;
                // 2. ユーザーのメッセージをDBに保存（ユーザーが特定できた場合のみ）
                if (userId) {
                    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].message.create({
                        data: {
                            content: userMessage,
                            role: "user",
                            userId: userId
                        }
                    });
                }
                // 3. 意図分類 (STORE or SEARCH)
                // ここでGeminiに「これは覚えさせるやつ？質問？」と聞きます
                // import { classifyIntent } from "./lib/gemini"; を忘れずに！
                const intent = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$gemini$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["classifyIntent"])(userMessage);
                console.log(`[LINE] 意図: ${intent}`);
                let replyText = "";
                if (intent === "STORE") {
                    // === 覚えるモード ===
                    const vector = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$gemini$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getEmbedding"])(userMessage);
                    const id = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$uuid$2f$dist$2d$node$2f$v4$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__default__as__v4$3e$__["v4"])();
                    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$pinecone$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["upsertDocument"])(id, userMessage, vector);
                    replyText = "覚えました！🧠";
                } else {
                    // === 検索・会話モード ===
                    const vector = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$gemini$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getEmbedding"])(userMessage);
                    const context = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$pinecone$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["queryDocuments"])(vector);
                    replyText = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$gemini$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["generateAnswer"])(userMessage, context);
                }
                // 4. LINEに返信
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$line$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["replyMessage"])(replyToken, replyText);
                console.log(`[LINE] 返信: ${replyText}`);
                // 5. AIの回答をDBに保存（ユーザーが特定できた場合のみ）
                if (userId) {
                    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].message.create({
                        data: {
                            content: replyText,
                            role: "assistant",
                            userId: userId
                        }
                    });
                }
            } catch (e) {
                console.error("[LINE] Error:", e);
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$line$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["replyMessage"])(replyToken, "すみません、エラーが発生しました。");
            }
        }
    }
    return c.json({
        success: true
    });
});
const __TURBOPACK__default__export__ = app;
}),
"[project]/app/api/[[...route]]/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET,
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$hono$2f$dist$2f$adapter$2f$vercel$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/hono/dist/adapter/vercel/index.js [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$hono$2f$dist$2f$adapter$2f$vercel$2f$handler$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/hono/dist/adapter/vercel/handler.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/index.ts [app-route] (ecmascript)");
;
;
const GET = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$hono$2f$dist$2f$adapter$2f$vercel$2f$handler$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["handle"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"]);
const POST = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$hono$2f$dist$2f$adapter$2f$vercel$2f$handler$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["handle"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"]);
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__6b8c881b._.js.map