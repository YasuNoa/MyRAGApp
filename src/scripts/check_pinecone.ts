import { Pinecone } from "@pinecone-database/pinecone";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.PINECONE_API_KEY;
const indexName = process.env.PINECONE_INDEX || "quickstart";

if (!apiKey) {
    console.error("PINECONE_API_KEY not set");
    process.exit(1);
}

const pc = new Pinecone({ apiKey });
const index = pc.index(indexName);

async function main() {
    try {
        console.log(`Checking index: ${indexName}...`);
        const stats = await index.describeIndexStats();
        console.log("Index Stats:", JSON.stringify(stats, null, 2));

        if (stats.totalRecordCount === 0) {
            console.log("Index is empty.");
            return;
        }

        // ダミーベクトルで検索して、データの中身（ベクトル値含む）を確認する
        // text-embedding-004 は 768次元
        const dummyVector = new Array(768).fill(0.01);

        const queryResponse = await index.query({
            vector: dummyVector,
            topK: 1,
            includeValues: true, // ベクトル値を取得するフラグ
            includeMetadata: true // メタデータ（テキスト）を取得するフラグ
        });

        console.log("\nSample Data (Top 1 match):");
        if (queryResponse.matches.length === 0) {
            console.log("No matches found.");
        } else {
            queryResponse.matches.forEach(match => {
                console.log(`ID: ${match.id}`);
                console.log(`Metadata:`, match.metadata);
                console.log(`Vector Length: ${match.values?.length}`);
                console.log(`Vector Values (First 5):`, match.values?.slice(0, 5));

                if (match.values && match.values.length > 0) {
                    console.log("✅ Vector data is present!");
                } else {
                    console.log("❌ Vector data is MISSING!");
                }
            });
        }

    } catch (error) {
        console.error("Error checking Pinecone:", error);
    }
}

main();
