import { Client, MiddlewareConfig } from "@line/bot-sdk";
import dotenv from "dotenv";

dotenv.config();

const config: MiddlewareConfig = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
    channelSecret: process.env.LINE_CHANNEL_SECRET || "",
};

export const lineClient = new Client({
    channelAccessToken: config.channelAccessToken || "",
    channelSecret: config.channelSecret,
});
export const lineConfig = config;

export async function replyMessage(replyToken: string, text: string) {
    await lineClient.replyMessage(replyToken, {
        type: "text",
        text: text,
    });
}
