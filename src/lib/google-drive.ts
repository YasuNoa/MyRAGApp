import { google } from "googleapis";

// Polyfill for pdf-parse dependencies
if (typeof global.DOMMatrix === 'undefined') {
    // @ts-ignore
    global.DOMMatrix = class DOMMatrix { };
}

const pdfParse = require("pdf-parse");

export async function listDriveFiles(accessToken: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const drive = google.drive({ version: "v3", auth });

    try {
        const response = await drive.files.list({
            q: "(mimeType = 'application/pdf' or mimeType = 'text/plain' or mimeType = 'application/vnd.google-apps.document') and trashed = false",
            fields: "files(id, name, mimeType, webViewLink, iconLink, createdTime)",
            orderBy: "createdTime desc",
            pageSize: 20,
        });

        return response.data.files || [];
    } catch (error) {
        console.error("Error listing Drive files:", error);
        throw error;
    }
}

export async function getDriveFileContent(accessToken: string, fileId: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const drive = google.drive({ version: "v3", auth });

    try {
        // Check file metadata to determine if it's a Google Doc
        const fileMetadata = await drive.files.get({ fileId, fields: "mimeType" });
        const mimeType = fileMetadata.data.mimeType;

        if (mimeType === "application/vnd.google-apps.document") {
            // Export Google Doc as plain text
            const response = await drive.files.export(
                { fileId, mimeType: "text/plain" },
                { responseType: "arraybuffer" }
            );
            return Buffer.from(response.data as ArrayBuffer);
        } else {
            // Download binary file (PDF, etc.)
            const response = await drive.files.get(
                { fileId, alt: "media" },
                { responseType: "arraybuffer" }
            );
            return Buffer.from(response.data as ArrayBuffer);
        }
    } catch (error) {
        console.error("Error getting Drive file content:", error);
        throw error;
    }
}

export async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
    try {
        if (mimeType === "application/pdf") {
            // Robustly handle pdf-parse import
            const parser = pdfParse.default || pdfParse;
            const data = await parser(buffer);
            return data.text;
        } else if (mimeType === "text/plain" || mimeType === "application/vnd.google-apps.document") {
            return buffer.toString("utf-8");
        } else {
            throw new Error(`Unsupported mimeType: ${mimeType}`);
        }
    } catch (error) {
        console.error("Error extracting text:", error);
        throw error;
    }
}
