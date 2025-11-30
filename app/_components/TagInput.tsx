"use client";

import { useState, KeyboardEvent } from "react";
import { X } from "lucide-react";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export default function TagInput({ tags, onChange, placeholder = "タグを入力 (Enterで追加)" }: TagInputProps) {
  const [input, setInput] = useState("");

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = input.trim();
      if (trimmed && !tags.includes(trimmed)) {
        onChange([...tags, trimmed]);
        setInput("");
      }
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      // Remove last tag if input is empty
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((tag) => tag !== tagToRemove));
  };

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "8px",
        padding: "8px",
        backgroundColor: "var(--input-bg)",
        borderRadius: "var(--radius)",
        border: "1px solid var(--border-color)",
        alignItems: "center",
      }}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            backgroundColor: "var(--primary-color)",
            color: "white",
            padding: "4px 8px",
            borderRadius: "16px",
            fontSize: "14px",
          }}
        >
          {tag}
          <button
            onClick={() => removeTag(tag)}
            style={{
              background: "none",
              border: "none",
              color: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={14} />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : ""}
        style={{
          flex: 1,
          background: "transparent",
          border: "none",
          color: "var(--text-primary)",
          outline: "none",
          minWidth: "120px",
          fontSize: "14px",
        }}
      />
    </div>
  );
}
