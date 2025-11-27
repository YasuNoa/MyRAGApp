import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
    console.error("GOOGLE_API_KEY not set");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function main() {
    try {
        console.log("Fetching available models...");
        // モデル一覧を取得するための特別なメソッドはないため、
        // 既知のモデルで試すか、ドキュメントを参照する必要がありますが、
        // ここではエラーメッセージにある通り ListModels API を叩きたいところです。
        // しかしGoogleGenerativeAI SDKには listModels メソッドがなさそうなので、
        // 直接REST APIを叩いてみます。

        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log("Available Models:");
            data.models.forEach((model: any) => {
                console.log(`- ${model.name} (${model.displayName})`);
                console.log(`  Supported methods: ${model.supportedGenerationMethods}`);
            });
        } else {
            console.log("No models found or error:", data);
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

main();
