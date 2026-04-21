"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus } from "lucide-react";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ account_number: "", business_name: "", contact_name: "", service_address: "", city: "", zip_code: "" });
  const [saving, setSaving] = useState(false);

  const load = async (q?: string) => {
    setLoading(true);
    const data = await api.getCustomers(q);
    setCustomers(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); load(search); };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createCustomer({ ...form, state: "TX" });
      setShowForm(false);
      setForm({ account_number: "", business_name: "", contact_name: "", service_address: "", city: "", zip_code: "" });
      load();
    } finally { setSaving(false); }
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 mt-1">{customers.length} total accounts</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader><CardTitle>New Customer</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
              {[
                { key: "account_number", label: "Account Number" },
                { key: "business_name", label: "Name" },
                { key: "contact_name", label: "Contact Name" },
                { key: "service_address", label: "Service Address" },
                { key: "city", label: "City" },
                { key: "zip_code", label: "ZIP Code" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-sm font-medium text-gray-700 block mb-1">{label}</label>
                  <input
                    required={["account_number", "business_name", "service_address", "city", "zip_code"].includes(key)}
                    value={(form as any)[key]}
                    onChange={e => setForm({ ...form, [key]: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              ))}
              <div className="col-span-2 flex gap-2">
                <button type="submit" disabled={saving} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                  {saving ? "Saving..." : "Save Customer"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm border hover:bg-gray-50">Cancel</button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name..."
                className="w-full border rounded-lg pl-9 pr-4 py-2 text-sm"
              />
            </div>
            <button type="submit" className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">Search</button>
          </form>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-gray-500 text-sm">Loading...</p> : customers.length === 0 ? (
            <p className="text-gray-500 text-sm">No customers yet. Click "Add Customer" to get started.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Account #</th>
                  <th className="pb-2 font-medium">Address</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c: any) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="py-3 font-medium">{c.business_name}</td>
                    <td className="py-3 text-gray-500">{c.account_number}</td>
                    <td className="py-3 text-gray-500">{c.service_address}, {c.city}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                        {c.is_active ? "Active" : "Inactive"}
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
