"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Send } from "lucide-react";
import TagInput from "@/app/_components/TagInput";
import LayoutWrapper from "@/app/_components/LayoutWrapper";

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  useEffect(() => {
    // Fetch available tags
    fetch("/api/knowledge/categories")
      .then((res) => res.json())
      .then((data) => {
        if (data.tags) {
          setAvailableTags(data.tags);
        }
      })
      .catch((err) => console.error("Failed to fetch tags", err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          query: userMessage.content,
          tags: tags 
        }),
      });

      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        const botMessage = { role: "assistant", content: data.answer || "エラーが発生しました" };
        setMessages((prev) => [...prev, botMessage]);
      } else {
        const text = await res.text();
        setMessages((prev) => [...prev, { role: "assistant", content: "サーバーエラー: " + text }]);
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [...prev, { role: "assistant", content: "通信エラーが発生しました" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LayoutWrapper>
      <div className="max-w-4xl mx-auto p-4 flex flex-col h-[calc(100vh-100px)]">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
            じぶんAI
          </h1>
          <p className="text-gray-400">
            あなたの個人的な知識ベースと対話しましょう
          </p>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-4 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-20">
              <p>何でも聞いてください。</p>
              <p className="text-sm mt-2">例: "Pythonの勉強方法は？", "先週の会議の要約は？"</p>
            </div>
          )}
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-2xl ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-gray-700 text-gray-100 rounded-bl-none"
                }`}
              >
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-700 text-gray-100 p-3 rounded-2xl rounded-bl-none animate-pulse">
                考え中...
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="relative bg-gray-900/50 p-4 rounded-2xl border border-gray-700">
          {/* Tag Filter */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
               <span className="text-xs text-gray-400 font-bold">フィルタ (タグ):</span>
            </div>
            <TagInput tags={tags} onChange={setTags} placeholder="タグで絞り込み..." />
            {/* Suggestions */}
            {availableTags.length > 0 && (
              <div className="flex gap-2 mt-2 overflow-x-auto pb-2 scrollbar-hide">
                {availableTags.filter(t => !tags.includes(t)).slice(0, 8).map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setTags([...tags, tag])}
                    className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1 rounded-full transition-colors whitespace-nowrap border border-gray-700"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="メッセージを入力..."
              className="flex-1 p-4 pr-12 rounded-xl bg-gray-800 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-white placeholder-gray-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={20} />
            </button>
          </div>
        </form>
      </div>
    </LayoutWrapper>
  );
}
