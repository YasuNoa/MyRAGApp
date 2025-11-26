import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
    console.error("GOOGLE_API_KEY is not set");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Dummy
        // Actually we need to use the model manager if available, or just try to list.
        // The SDK doesn't have a direct listModels on the instance?
        // It seems currently the SDK might not expose listModels directly on the main class easily in all versions.
        // But let's check if we can use the API directly or if the SDK has it.
        // Looking at the error message: "Call ListModels to see the list of available models"

        // Use fetch directly to list models
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));

    } catch (e) {
        console.error(e);
    }
}

listModels();
