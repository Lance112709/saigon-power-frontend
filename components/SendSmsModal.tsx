"use client";
import { useState } from "react";
import { X, MessageSquare, Send } from "lucide-react";
import { api } from "@/lib/api";

interface Props {
  to: string;
  contactName: string;
  leadId?: string;
  customerId?: string;
  dealId?: string;
  onClose: () => void;
}

export default function SendSmsModal({ to, contactName, leadId, customerId, dealId, onClose }: Props) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);

  const remaining = 320 - body.length;

  async function handleSend() {
    if (!body.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const res = await api.sendSms({
        to,
        body: body.trim(),
        lead_id: leadId,
        customer_id: customerId,
        deal_id: dealId,
      });
      setResult({ ok: res.ok ?? true });
      if (res.ok) {
        setTimeout(onClose, 1200);
      }
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("opted_out")) {
        setResult({ ok: false, error: "This contact has opted out of SMS." });
      } else {
        setResult({ ok: false, error: "Failed to send. Check Telnyx configuration." });
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#0F1D5E]" />
            <h2 className="font-semibold text-[#0F1D5E]">Send SMS</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">To</p>
            <p className="text-sm font-medium text-gray-800">{contactName} — {to}</p>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Message</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={4}
              maxLength={320}
              placeholder="Type your message..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 resize-none"
            />
            <p className={`text-xs mt-1 text-right ${remaining < 40 ? "text-amber-500" : "text-gray-400"}`}>
              {remaining} characters left
            </p>
          </div>

          {result && (
            <div className={`text-sm rounded-lg px-3 py-2 ${result.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
              {result.ok ? "Message sent successfully!" : result.error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-5 pb-5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-xl"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!body.trim() || sending}
            className="flex items-center gap-2 px-4 py-2 bg-[#0F1D5E] text-white text-sm font-medium rounded-xl hover:bg-[#0F1D5E]/90 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
