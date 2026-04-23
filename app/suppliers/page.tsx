"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Save } from "lucide-react";

function SupplierCard({ supplier, onUpdated }: { supplier: any; onUpdated: () => void }) {
  const [adder, setAdder] = useState(supplier.default_adder != null ? String(supplier.default_adder) : "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.updateSupplier(supplier.id, { default_adder: adder ? parseFloat(adder) : null });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onUpdated();
    } finally { setSaving(false); }
  };

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-semibold text-gray-900">{supplier.name}</div>
            <div className="text-xs text-gray-400 mt-0.5 font-mono">{supplier.code}</div>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${supplier.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
            {supplier.is_active ? "Active" : "Inactive"}
          </span>
        </div>
        {supplier.notes && <p className="text-sm text-gray-500 mt-3">{supplier.notes}</p>}
        {supplier.contact_email && <p className="text-xs text-gray-400 mt-2">{supplier.contact_email}</p>}

        {/* Default Adder */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <label className="text-xs font-semibold text-gray-500 block mb-1.5">
            Default Residential Adder ($/kWh)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.0001"
              placeholder="e.g. 0.0070"
              value={adder}
              onChange={e => setAdder(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20"
            />
            <button onClick={save} disabled={saving}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                saved ? "bg-emerald-100 text-emerald-700" : "bg-[#0F1D5E] text-white hover:bg-[#0F1D5E]/90"
              } disabled:opacity-50`}>
              <Save className="w-3 h-3" />
              {saved ? "Saved!" : saving ? "..." : "Save"}
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Auto-applied to Residential deals for this REP</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", contact_email: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const data = await api.getSuppliers();
    setSuppliers(data);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createSupplier(form);
      setShowForm(false);
      setForm({ name: "", code: "", contact_email: "", notes: "" });
      load();
    } finally { setSaving(false); }
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-gray-500 mt-1">Energy retailers (REPs) that pay your commissions</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
          <Plus className="w-4 h-4" /> Add Supplier
        </button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader><CardTitle>New Supplier</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
              {[
                { key: "name", label: "Full Name (e.g. NRG / Discount Power)" },
                { key: "code", label: "Short Code (e.g. NRG)" },
                { key: "contact_email", label: "Contact Email" },
                { key: "notes", label: "Notes" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-sm font-medium text-gray-700 block mb-1">{label}</label>
                  <input
                    required={["name", "code"].includes(key)}
                    value={(form as any)[key]}
                    onChange={e => setForm({ ...form, [key]: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              ))}
              <div className="col-span-2 flex gap-2">
                <button type="submit" disabled={saving} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                  {saving ? "Saving..." : "Save Supplier"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm border hover:bg-gray-50">Cancel</button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suppliers.map((s: any) => (
          <SupplierCard key={s.id} supplier={s} onUpdated={load} />
        ))}
      </div>
    </div>
  );
}
