"use client";
import { useState, useRef } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, CheckCircle, XCircle } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const statusColor: Record<string, string> = {
  confirmed: "bg-green-100 text-green-800",
  review: "bg-yellow-100 text-yellow-800",
  failed: "bg-red-100 text-red-800",
  pending: "bg-gray-100 text-gray-800",
  parsing: "bg-blue-100 text-blue-800",
};

const FIELD_LABELS: Record<string, string> = {
  esiid: "ESI ID",
  customer_name: "Customer Name",
  billing_month: "Billing Month",
  amount: "Amount",
  kwh: "kWh",
  rate: "Rate",
  customer_status: "Customer Status",
};

export default function UploadsPage() {
  const [dragging, setDragging]         = useState(false);
  const [uploading, setUploading]       = useState(false);
  const [result, setResult]             = useState<any>(null);
  const [error, setError]               = useState("");
  const [uploads, setUploads]           = useState<any[]>([]);
  const [loadingUploads, setLoadingUploads] = useState(false);
  const [confirming, setConfirming]     = useState(false);
  const [confirmed, setConfirmed]       = useState<any>(null);
  const [suppliers, setSuppliers]       = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [billingMonth, setBillingMonth] = useState("");
  const [manualMapping, setManualMapping] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const loadUploads = async () => {
    setLoadingUploads(true);
    const data = await api.getUploads();
    setUploads(data);
    setLoadingUploads(false);
  };

  const loadSuppliers = async () => {
    const data = await api.getSuppliers();
    setSuppliers(data);
  };

  const handleFile = async (file: File) => {
    setUploading(true);
    setError("");
    setResult(null);
    setConfirmed(null);
    setManualMapping({});
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.uploadFile(fd);
      if (res.detail) throw new Error(res.detail);
      setResult(res);
      // Pre-populate manual mapping from AI result
      setManualMapping(res.ai_mapping?.mapping ?? {});
      loadUploads();
      loadSuppliers();
    } catch (e: any) {
      setError(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedSupplier) return alert("Please select a supplier first.");
    if (!billingMonth) return alert("Please enter the billing month.");
    setConfirming(true);
    try {
      const mappingToSend = { ...result.ai_mapping, mapping: manualMapping };
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
      const res = await fetch(`${API_URL}/api/v1/uploads/${result.upload_batch_id}/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          file_hash: result.file_hash,
          supplier_id: selectedSupplier,
          billing_month: billingMonth,
          column_mapping: mappingToSend,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Confirm failed");
      setConfirmed(data);
      loadUploads();
    } catch (e: any) {
      setError(e.message || "Confirm failed");
    } finally {
      setConfirming(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const headers: string[] = result?.headers ?? [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Upload Commission Statements</h1>
        <p className="text-gray-500 mt-1">Upload NRG Excel or CSV files — AI will map the columns automatically</p>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
              dragging ? "border-green-500 bg-green-50" : "border-gray-300 hover:border-green-400 hover:bg-gray-50"
            }`}
          >
            <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">
              {uploading ? "Processing..." : "Drag & drop your Excel or CSV file here"}
            </p>
            <p className="text-gray-400 text-sm mt-1">or click to browse</p>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <XCircle className="w-5 h-5" /> {error}
            </div>
          )}

          {confirmed && (
            <div className="mt-4 space-y-3">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 font-medium">
                <CheckCircle className="w-5 h-5" />
                Imported {confirmed.rows_imported} records successfully!
                {confirmed.rows_skipped > 0 && <span className="text-gray-500 font-normal ml-2">({confirmed.rows_skipped} rows skipped)</span>}
              </div>

              {confirmed.going_final?.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-300 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700 font-bold mb-3">
                    <XCircle className="w-5 h-5" />
                    {confirmed.going_final.length} Account{confirmed.going_final.length > 1 ? "s" : ""} Going Final — Action Required
                  </div>
                  <div className="space-y-2">
                    {confirmed.going_final.map((a: any, i: number) => (
                      <div key={i} className="bg-white border border-red-200 rounded-lg px-4 py-3 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-gray-800 text-sm">
                            {a.lead?.name || a.customer_name || "Unknown"}
                          </div>
                          <div className="text-xs text-gray-400 font-mono mt-0.5">{a.esiid}</div>
                          {a.lead?.phone && (
                            <div className="text-xs text-gray-500 mt-0.5">{a.lead.phone}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-red-100 text-red-700 font-semibold px-2 py-1 rounded-full">{a.status}</span>
                          {a.lead?.id && (
                            <a href={`/crm/leads/${a.lead.id}`}
                              className="text-xs text-blue-600 hover:underline font-medium">
                              View Lead →
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {result && !confirmed && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 font-medium mb-4">
                <CheckCircle className="w-5 h-5" /> File parsed — {result.rows_parsed} rows found
              </div>

              {/* Column Mapping */}
              <div className="text-sm text-gray-700 font-semibold mb-2">
                Column Mapping
                <span className="text-gray-400 font-normal ml-2 text-xs">(fix any "Not found" by selecting the correct column)</span>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {Object.keys(FIELD_LABELS).map((field) => {
                  const current = manualMapping[field] ?? null;
                  const isMissing = !current;
                  return (
                    <div key={field} className={`rounded-lg p-3 border bg-white ${isMissing ? "border-red-300" : "border-gray-200"}`}>
                      <div className="text-xs font-semibold text-gray-500 mb-1">{FIELD_LABELS[field]}</div>
                      <select
                        value={current ?? ""}
                        onChange={e => setManualMapping(prev => ({ ...prev, [field]: e.target.value || null as any }))}
                        className={`w-full text-sm border rounded px-2 py-1 focus:outline-none ${isMissing ? "text-red-500 border-red-300" : "text-green-700 border-gray-200"}`}
                      >
                        <option value="">— Not mapped —</option>
                        {headers.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>

              {/* Supplier + Billing Month */}
              <div className="border-t pt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Supplier</label>
                  <select
                    value={selectedSupplier}
                    onChange={e => setSelectedSupplier(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Select supplier...</option>
                    {suppliers.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Billing Month</label>
                  <input
                    type="date"
                    value={billingMonth}
                    onChange={e => setBillingMonth(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <button
                onClick={handleConfirm}
                disabled={confirming}
                className="mt-4 w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {confirming ? "Importing..." : `Confirm & Import ${result.rows_parsed} Records`}
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Uploads</CardTitle>
          <button onClick={loadUploads} className="text-sm text-green-600 hover:underline">Refresh</button>
        </CardHeader>
        <CardContent>
          {loadingUploads ? (
            <p className="text-gray-500 text-sm">Loading...</p>
          ) : uploads.length === 0 ? (
            <p className="text-gray-500 text-sm">No uploads yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 font-medium">File</th>
                  <th className="pb-2 font-medium">Supplier</th>
                  <th className="pb-2 font-medium">Rows</th>
                  <th className="pb-2 font-medium">Imported</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {uploads.map((u: any) => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="py-3 font-medium truncate max-w-xs">{u.original_filename}</td>
                    <td className="py-3">{u.suppliers?.name ?? "—"}</td>
                    <td className="py-3">{u.rows_parsed ?? "—"}</td>
                    <td className="py-3">{u.rows_imported ?? "—"}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[u.status] ?? ""}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
