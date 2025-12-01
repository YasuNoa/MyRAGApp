"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

type FinalResult = {
    transcript: string;
    summary: string;
    document: any;
};

type NoteContextType = {
    transcript: string;
    setTranscript: React.Dispatch<React.SetStateAction<string>>;
    finalResult: FinalResult | null;
    setFinalResult: React.Dispatch<React.SetStateAction<FinalResult | null>>;
    isProcessing: boolean;
    setIsProcessing: React.Dispatch<React.SetStateAction<boolean>>;
    error: string | null;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
    tags: string[];
    setTags: React.Dispatch<React.SetStateAction<string[]>>;
    selectedFiles: File[];
    setSelectedFiles: React.Dispatch<React.SetStateAction<File[]>>;
    clearNote: () => void;
};

const NoteContext = createContext<NoteContextType | undefined>(undefined);

export function NoteProvider({ children }: { children: ReactNode }) {
    const [transcript, setTranscript] = useState("");
    const [finalResult, setFinalResult] = useState<FinalResult | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tags, setTags] = useState<string[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

    const clearNote = () => {
        setTranscript("");
        setFinalResult(null);
        setIsProcessing(false);
        setError(null);
        setTags([]);
        setSelectedFiles([]);
    };

    return (
        <NoteContext.Provider
            value={{
                transcript,
                setTranscript,
                finalResult,
                setFinalResult,
                isProcessing,
                setIsProcessing,
                error,
                setError,
                tags,
                setTags,
                selectedFiles,
                setSelectedFiles,
                clearNote,
            }}
        >
            {children}
        </NoteContext.Provider>
    );
}

export function useNote() {
    const context = useContext(NoteContext);
    if (context === undefined) {
        throw new Error("useNote must be used within a NoteProvider");
    }
    return context;
}
