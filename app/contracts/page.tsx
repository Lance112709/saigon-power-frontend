"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 6 }).format(n);
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await api.getContracts();
    setContracts(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contracts</h1>
          <p className="text-gray-500 mt-1">{contracts.length} contracts on file</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? <p className="text-gray-500 text-sm">Loading...</p> : contracts.length === 0 ? (
            <p className="text-gray-500 text-sm">No contracts yet. Add customers and service points first, then create contracts.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 font-medium">Contract #</th>
                  <th className="pb-2 font-medium">Customer</th>
                  <th className="pb-2 font-medium">Supplier</th>
                  <th className="pb-2 font-medium">ESIID</th>
                  <th className="pb-2 font-medium">Model</th>
                  <th className="pb-2 font-medium">Rate</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c: any) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="py-3 font-mono text-xs">{c.contract_number}</td>
                    <td className="py-3">{c.customers?.business_name}</td>
                    <td className="py-3">{c.suppliers?.code}</td>
                    <td className="py-3 font-mono text-xs">{c.service_points?.esiid}</td>
                    <td className="py-3">{c.commission_model === "per_kwh" ? "$/kWh" : "% of bill"}</td>
                    <td className="py-3">{fmt(c.commission_rate)}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.status === "active" ? "bg-green-100 text-green-800" :
                        c.status === "expired" ? "bg-gray-100 text-gray-600" :
                        "bg-yellow-100 text-yellow-800"
                      }`}>
                        {c.status}
                      </span>
                    </td>
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
