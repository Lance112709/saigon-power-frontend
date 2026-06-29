"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Bot, Send, Trash2, MessageSquare } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

async function sendChat(message: string, history: ChatMessage[]) {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const res = await fetch(`${API_URL}/api/v1/ai-agent/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, history }),
  });
  if (!res.ok) throw new Error("Request failed");
  const data = await res.json();
  return data.reply as string;
}

const STARTERS = [
  { label: "Company Overview", q: "Give me a full summary of the company status" },
  { label: "Active Deals", q: "How many active deals do we have and who are they with?" },
  { label: "Expiring Soon", q: "Which deals are expiring soon?" },
  { label: "Revenue & Commissions", q: "How are our commissions and revenue looking?" },
  { label: "Agent Performance", q: "How are agents performing?" },
  { label: "Urgent Alerts", q: "Any alerts or issues I should know about?" },
  { label: "Lead Pipeline", q: "How are our leads looking?" },
  { label: "Renewals Needed", q: "Which deals need to be renewed?" },
  { label: "Upload Statements", q: "What commission uploads have we received recently?" },
  { label: "Top Agent", q: "Who is our top performing agent and how many deals do they have?" },
  { label: "Monthly Estimate", q: "What is our estimated monthly commission from active deals?" },
  { label: "Expiring in 30 Days", q: "List all deals expiring within 30 days" },
];

export default function AiChatPage() {
  const { user } = useAuth();
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && user.role !== "admin") router.push("/dashboard");
  }, [user, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    const userMsg: ChatMessage = { role: "user", content: msg };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const reply = await sendChat(msg, next.slice(-10));
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't get a response. Please try again." }]);
    }

    setLoading(false);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-screen bg-[#F4F6FA]">

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0F1D5E] flex items-center justify-center">
            <Bot className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#0F1D5E]">AI Business Assistant</h1>
            <p className="text-xs text-slate-400">Ask anything about your leads, deals, commissions & more</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" /> Clear chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center max-w-xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-[#0F1D5E] flex items-center justify-center shadow-lg">
              <Bot className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Hi! I know your entire business.</h2>
              <p className="text-slate-500 mt-1 text-sm">I have access to all your CRM data — leads, deals, commissions, agents, and alerts. Just ask.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 w-full">
              {STARTERS.map(s => (
                <button
                  key={s.q}
                  onClick={() => handleSend(s.q)}
                  className="text-left px-4 py-3 rounded-xl border border-slate-200 hover:border-[#0F1D5E] hover:bg-[#EEF1FA] transition-colors bg-white shadow-sm group"
                >
                  <div className="text-xs font-bold text-[#0F1D5E] mb-0.5 group-hover:text-[#0F1D5E]">{s.label}</div>
                  <div className="text-xs text-slate-400 leading-snug">{s.q}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-3`}>
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-[#0F1D5E] flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-green-400" />
              </div>
            )}
            <div className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed shadow-sm ${
              msg.role === "user"
                ? "bg-[#0F1D5E] text-white rounded-br-sm"
                : "bg-white text-slate-800 border border-slate-200 rounded-bl-sm"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#0F1D5E] flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-green-400" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center shadow-sm">
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="bg-white border-t border-slate-200 px-4 py-4 shrink-0">
        <div className="max-w-4xl mx-auto flex gap-3">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Ask about your business..."
            disabled={loading}
            className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 focus:border-[#0F1D5E]/40 disabled:opacity-50 bg-slate-50"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="px-5 py-3 bg-[#0F1D5E] text-white rounded-xl hover:bg-[#1a2d7c] transition disabled:opacity-40 flex items-center gap-2 text-sm font-semibold"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </div>
      </div>

    </div>
  );
}
