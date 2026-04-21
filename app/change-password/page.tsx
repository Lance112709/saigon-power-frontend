"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Zap, Eye, EyeOff } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ChangePasswordPage() {
  const { token, logout } = useAuth();
  const router = useRouter();

  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirm) { setError("Passwords do not match"); return; }
    if (newPw.length < 8) { setError("Password must be at least 8 characters"); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ new_password: newPw }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Failed" }));
        throw new Error(err.detail || "Failed");
      }
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to update password");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F4F6FA] flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-[#0F1D5E] text-white px-6 py-3 rounded-2xl mb-4">
            <Zap className="w-5 h-5 text-green-400" />
            <span className="font-bold text-lg">Saigon Power</span>
          </div>
          <p className="text-slate-700 font-semibold">Set Your New Password</p>
          <p className="text-slate-400 text-sm mt-1">You must set a new password before continuing.</p>
        </div>

        <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                required
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                className="w-full px-4 py-2.5 pr-10 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20"
                placeholder="Min. 8 characters"
              />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password</label>
            <input
              type="password"
              required
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20"
              placeholder="Repeat password"
            />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-[#0F1D5E] text-white font-semibold text-sm hover:bg-[#0F1D5E]/90 disabled:opacity-50 transition-colors">
            {loading ? "Saving..." : "Set Password & Continue"}
          </button>
          <button type="button" onClick={logout} className="w-full text-sm text-slate-400 hover:text-slate-600">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
