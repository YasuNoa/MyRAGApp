import { Document } from "@prisma/client";

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || "http://backend:8000";

export const PythonBackendService = {
    /**
     * Imports a file to the Python backend for processing (chunking, embedding, etc.).
     */
    /**
     * Imports a file to the Python backend.
     * The backend's /import-file endpoint now handles dispatching based on MIME type.
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
            userPlan?: string;
        }
    ) {
        if (metadata.mimeType.startsWith("audio/")) {
            return this.processVoiceMemo(file, metadata);
        }

        const formData = new FormData();
        formData.append("file", file, metadata.fileName || "file");
        formData.append("metadata", JSON.stringify(metadata));

        console.log(`[PythonService] Sending file to ${PYTHON_BACKEND_URL}/import-file`, metadata);

        try {
            const response = await fetch(`${PYTHON_BACKEND_URL}/api/knowledge/import-file`, {
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

    async importPdf(file: Blob | File, metadata: any) {
        return this.importFile(file, { ...metadata, mimeType: 'application/pdf' });
    },

    async importImage(file: Blob | File, metadata: any) {
        return this.importFile(file, { ...metadata, mimeType: file.type || 'image/jpeg' });
    },

    async importPptx(file: Blob | File, metadata: any) {
        return this.importFile(file, { ...metadata, mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
    },

    async importDocx(file: Blob | File, metadata: any) {
        return this.importFile(file, { ...metadata, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    },

    async importXlsx(file: Blob | File, metadata: any) {
        return this.importFile(file, { ...metadata, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    },

    async importCsv(file: Blob | File, metadata: any) {
        return this.importFile(file, { ...metadata, mimeType: 'text/csv' });
    },

    async importTextFile(file: Blob | File, metadata: any) {
        return this.importFile(file, { ...metadata, mimeType: 'text/plain' });
    },

    async _uploadToEndpoint(endpoint: string, file: Blob | File, metadata: any) {
        const formData = new FormData();
        formData.append("file", file, metadata.fileName || "file");
        formData.append("metadata", JSON.stringify(metadata));

        console.log(`[PythonService] Sending file to ${PYTHON_BACKEND_URL}${endpoint}`, metadata);

        try {
            const response = await fetch(`${PYTHON_BACKEND_URL}${endpoint}`, {
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
     * Processes a voice memo: Transcribes and summarizes.
     */
    async processVoiceMemo(
        file: Blob | File,
        metadata: {
            userId: string;
            fileId: string;
            dbId?: string;
            tags?: string[];
            userPlan?: string;
        }
    ) {
        const formData = new FormData();
        // Ensure filename has extension for backend detection if needed, though we use mime type
        const fileName = (file as File).name || "voice_memo.webm";
        formData.append("file", file, fileName);
        formData.append("metadata", JSON.stringify(metadata));
        formData.append("save", "false"); // Don't save preview to DB (prevent ghost vectors)

        console.log(`[PythonService] Sending voice memo to ${PYTHON_BACKEND_URL}/api/voice/process`, metadata);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes timeout for audio processing

            const response = await fetch(`${PYTHON_BACKEND_URL}/api/voice/process`, {
                method: "POST",
                body: formData,
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

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
     * Saves a voice memo to the backend (DB + Vector Store).
     */
    async saveVoiceMemo(data: {
        userId: string;
        transcript: string;
        summary: string;
        title: string;
        tags: string[];
    }) {
        console.log(`[PythonService] Saving voice memo for user ${data.userId}`);
        try {
            const response = await fetch(`${PYTHON_BACKEND_URL}/api/voice/save`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[PythonService] Save Voice Error: ${response.status} ${errorText}`);
                throw new Error(`Python Backend save failed: ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`[PythonService] Save Voice Network Error:`, error);
            throw error;
        }
    },

    /**
     * Imports text to the Python backend for processing (chunking, embedding, etc.).
     */
    async importText(
        text: string,
        metadata: {
            userId: string;
            dbId?: string;
            tags?: string[];
            summary?: string;
        }
    ) {
        console.log(`[PythonService] Importing text for user ${metadata.userId}`);
        try {
            const response = await fetch(`${PYTHON_BACKEND_URL}/api/knowledge/import-text`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: text,
                    userId: metadata.userId,
                    dbId: metadata.dbId,
                    tags: metadata.tags || [],
                    summary: metadata.summary,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[PythonService] Import Text Error: ${response.status} ${errorText}`);
                throw new Error(`Python Backend import text failed: ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`[PythonService] Import Text Network Error:`, error);
            throw error;
        }
    },

    /**
     * Updates tags for a file in the vector store.
     */
    async updateTags(userId: string, fileId: string, tags: string[]) {
        console.log(`[PythonService] Updating tags for file ${fileId}`);
        try {
            const response = await fetch(`${PYTHON_BACKEND_URL}/api/knowledge/update-knowledge`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: fileId, userId, tags }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[PythonService] Update Tags Error: ${response.status} ${errorText}`);
                // Don't throw error here, just log it. Vector store update failure shouldn't block DB update?
                // But we want consistency. Let's throw.
                throw new Error(`Python Backend update tags failed: ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`[PythonService] Update Tags Network Error:`, error);
            throw error;
        }
    },

    /**
     * Deletes vectors associated with a file from the vector store.
     */
    async deleteFile(userId: string, fileId: string) {
        console.log(`[PythonService] Deleting file ${fileId} for user ${userId}`);
        try {
            const response = await fetch(`${PYTHON_BACKEND_URL}/api/knowledge/delete-file`, {
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
