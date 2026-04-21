"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const statusColor: Record<string, string> = {
  matched: "bg-green-100 text-green-800",
  short_paid: "bg-red-100 text-red-800",
  over_paid: "bg-blue-100 text-blue-800",
  missing: "bg-orange-100 text-orange-800",
  unexpected: "bg-gray-100 text-gray-800",
};

const severityColor: Record<string, string> = {
  low: "text-gray-500",
  medium: "text-yellow-600",
  high: "text-orange-600",
  critical: "text-red-600 font-bold",
};

function fmt(n: number | null) {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export default function ReconciliationPage() {
  const [runs, setRuns] = useState<any[]>([]);
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [billingMonth, setBillingMonth] = useState("");
  const [running, setRunning] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  const loadRuns = async () => {
    const data = await api.getRuns();
    setRuns(data);
  };

  useEffect(() => { loadRuns(); }, []);

  const loadItems = async (run: any) => {
    setSelectedRun(run);
    setLoading(true);
    const data = await api.getRunItems(run.id, statusFilter || undefined);
    setItems(data);
    setLoading(false);
  };

  const triggerRun = async () => {
    if (!billingMonth) return alert("Enter a billing month (e.g. 2026-03-01)");
    setRunning(true);
    try {
      await api.triggerReconciliation(billingMonth);
      await loadRuns();
    } finally {
      setRunning(false);
    }
  };

  const resolveItem = async (id: string) => {
    const notes = prompt("Add a note (optional):") ?? "";
    await api.resolveItem(id, notes);
    if (selectedRun) loadItems(selectedRun);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Reconciliation</h1>
        <p className="text-gray-500 mt-1">Compare expected vs actual commissions and flag discrepancies</p>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle>Run Reconciliation</CardTitle></CardHeader>
        <CardContent className="flex gap-3 items-end">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Billing Month</label>
            <input
              type="date"
              value={billingMonth}
              onChange={e => setBillingMonth(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={triggerRun}
            disabled={running}
            className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {running ? "Running..." : "Run Now"}
          </button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Reconciliation Runs</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
            {runs.length === 0 ? (
              <p className="text-gray-500 text-sm">No runs yet.</p>
            ) : runs.map((run: any) => (
              <button
                key={run.id}
                onClick={() => loadItems(run)}
                className={`w-full text-left p-3 rounded-lg border text-sm hover:bg-gray-50 transition-colors ${selectedRun?.id === run.id ? "border-green-500 bg-green-50" : "border-gray-200"}`}
              >
                <div className="font-medium">{run.billing_month}</div>
                <div className="text-gray-500 text-xs mt-1">
                  {run.suppliers?.name ?? "All suppliers"} · {run.missing_count} missing · {run.short_paid_count} short
                </div>
                <div className="text-xs mt-1">
                  <span className={run.total_discrepancy < 0 ? "text-red-600" : "text-green-600"}>
                    {fmt(run.total_discrepancy)}
                  </span>
                  {" discrepancy"}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{selectedRun ? `Items — ${selectedRun.billing_month}` : "Select a run"}</CardTitle>
            {selectedRun && (
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); }}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="">All statuses</option>
                <option value="missing">Missing</option>
                <option value="short_paid">Short Paid</option>
                <option value="over_paid">Over Paid</option>
                <option value="matched">Matched</option>
              </select>
            )}
          </CardHeader>
          <CardContent className="overflow-x-auto max-h-[500px] overflow-y-auto">
            {!selectedRun ? (
              <p className="text-gray-500 text-sm">Select a reconciliation run from the left to see details.</p>
            ) : loading ? (
              <p className="text-gray-500 text-sm">Loading...</p>
            ) : items.length === 0 ? (
              <p className="text-gray-500 text-sm">No items found.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium">ESIID</th>
                    <th className="pb-2 font-medium text-right">Expected</th>
                    <th className="pb-2 font-medium text-right">Actual</th>
                    <th className="pb-2 font-medium text-right">Diff</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any) => (
                    <tr key={item.id} className={`border-b last:border-0 ${item.is_resolved ? "opacity-40" : ""}`}>
                      <td className="py-2 font-mono text-xs">{item.esiid}</td>
                      <td className="py-2 text-right">{fmt(item.expected_amount)}</td>
                      <td className="py-2 text-right">{fmt(item.actual_amount)}</td>
                      <td className={`py-2 text-right ${severityColor[item.severity ?? "low"]}`}>
                        {fmt(item.discrepancy_amount)}
                      </td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[item.status] ?? ""}`}>
                          {item.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-2">
                        {!item.is_resolved && (
                          <button
                            onClick={() => resolveItem(item.id)}
                            className="text-xs text-green-600 hover:underline"
                          >
                            Resolve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
