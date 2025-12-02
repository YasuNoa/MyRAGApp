import { useState, KeyboardEvent, useEffect, useRef } from "react";
import { X, Tag, ChevronDown } from "lucide-react";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export default function TagInput({ tags, onChange, placeholder = "タグを入力 (Enterで追加)" }: TagInputProps) {
  const [input, setInput] = useState("");
  const [recentTags, setRecentTags] = useState<string[]>([]);
  const [showRecent, setShowRecent] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const res = await fetch("/api/tags");
        if (res.ok) {
          const data = await res.json();
          setRecentTags(data.tags);
        }
      } catch (e) {
        console.error("Failed to fetch tags", e);
      }
    };
    fetchTags();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowRecent(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addTag = (tagToAdd: string) => {
    const trimmed = tagToAdd.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
      setInput("");
      setShowRecent(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.nativeEvent.isComposing) return;
      addTag(input);
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((tag) => tag !== tagToRemove));
  };

  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "8px",
        padding: "8px",
        backgroundColor: "var(--input-bg)",
        borderRadius: "var(--radius)",
        border: "1px solid var(--border-color)",
        alignItems: "center",
        position: "relative"
      }}
    >
      {/* Recent Tags Button */}
      <button
        onClick={() => setShowRecent(!showRecent)}
        style={{
          background: "none",
          border: "none",
          color: "var(--text-secondary)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          padding: "4px",
          borderRadius: "4px",
          backgroundColor: showRecent ? "rgba(255,255,255,0.1)" : "transparent"
        }}
        title="履歴からタグを選択"
      >
        <Tag size={16} />
        <ChevronDown size={12} style={{ marginLeft: "2px" }} />
      </button>

      {/* Recent Tags Dropdown */}
      {showRecent && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          marginTop: "4px",
          backgroundColor: "#1e1e1e", // Dark background
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
          padding: "8px",
          zIndex: 100,
          boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
          minWidth: "200px",
          maxHeight: "200px",
          overflowY: "auto"
        }}>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px", paddingLeft: "4px" }}>
            最近使用したタグ
          </div>
          {recentTags.length === 0 ? (
            <div style={{ padding: "8px", color: "var(--text-secondary)", fontSize: "13px" }}>
              履歴がありません
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {recentTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => addTag(tag)}
                  style={{
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    color: "var(--text-primary)",
                    padding: "6px 8px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    opacity: tags.includes(tag) ? 0.5 : 1,
                  }}
                  disabled={tags.includes(tag)}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                >
                  <Tag size={12} />
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

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
        onBlur={() => addTag(input)}
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
