import { Client, MiddlewareConfig } from "@line/bot-sdk";
import dotenv from "dotenv";

dotenv.config();

// ビルド時などに環境変数がなくてもエラーにならないようにする
// 実際に使うタイミングでエラーが出るのはOK
const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || "dummy_token_for_build";
const channelSecret = process.env.LINE_CHANNEL_SECRET || "dummy_secret_for_build";

const config: MiddlewareConfig = {
    channelAccessToken,
    channelSecret,
};

export const lineClient = new Client({
    channelAccessToken,
    channelSecret,
});
export const lineConfig = config;

export async function replyMessage(replyToken: string, text: string) {
    await lineClient.replyMessage(replyToken, {
        type: "text",
        text: text,
    });
}
