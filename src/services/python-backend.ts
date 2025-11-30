import { Document } from "@prisma/client";

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || "http://backend:8000";

export const PythonBackendService = {
    /**
     * Imports a file to the Python backend for processing (chunking, embedding, etc.).
     */
    async importFile(
        file: Blob | File,
        metadata: {
            userId: string;
            fileId: string;
            mimeType: string;
            fileName?: string;
            tags?: string[];
            dbId?: string;
        }
    ) {
        const formData = new FormData();
        formData.append("file", file, metadata.fileName || "file");
        formData.append("metadata", JSON.stringify(metadata));

        console.log(`[PythonService] Sending file to ${PYTHON_BACKEND_URL}/import-file`, metadata);

        try {
            const response = await fetch(`${PYTHON_BACKEND_URL}/import-file`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[PythonService] Error: ${response.status} ${errorText}`);
                throw new Error(`Python Backend failed: ${errorText}`);
            }

            const result = await response.json();
            console.log(`[PythonService] Success:`, result);
            return result;
        } catch (error) {
            console.error(`[PythonService] Network or Server Error:`, error);
            throw error;
        }
    },

    /**
     * Deletes vectors associated with a file from Pinecone.
     */
    async deleteFile(userId: string, fileId: string) {
        console.log(`[PythonService] Deleting file ${fileId} for user ${userId}`);
        try {
            const response = await fetch(`${PYTHON_BACKEND_URL}/delete-file`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, fileId }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[PythonService] Delete Error: ${response.status} ${errorText}`);
                throw new Error(`Python Backend delete failed: ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`[PythonService] Delete Network Error:`, error);
            throw error;
        }
    }
};
