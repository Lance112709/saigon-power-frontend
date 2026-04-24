"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { FileText, Save, Eye, EyeOff, RefreshCw } from "lucide-react";

const DEFAULT_TEMPLATE = `<div style="font-family: Arial, sans-serif; font-size: 11px; color: #000; padding: 24px 28px; max-width: 720px; margin: 0 auto; background: #fff;">

  <!-- Header -->
  <div style="text-align: center; border-bottom: 2px solid #0F1D5E; padding-bottom: 14px; margin-bottom: 18px;">
    <div style="font-size: 20px; font-weight: 900; color: #0F1D5E; letter-spacing: 2px;">SAIGON POWER LLC</div>
    <div style="font-size: 12px; font-weight: bold; color: #333; margin-top: 5px;">ELECTRICITY AUTHORIZATION FORM</div>
    <div style="font-size: 10px; color: #666; margin-top: 2px;">Fixed Rate Unbundled Product</div>
    <div style="font-size: 9px; color: #999; margin-top: 5px;">9999 Bellaire Blvd Suite 7E, Houston TX 77036 &nbsp;|&nbsp; power@saigonllc.com &nbsp;|&nbsp; Mon–Fri 9AM–6PM</div>
  </div>

  <!-- Account Information -->
  <div style="margin-bottom: 16px;">
    <div style="background: #0F1D5E; color: white; padding: 5px 10px; font-weight: bold; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; border-radius: 2px;">Account Information</div>
    <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
      <tr>
        <td style="width: 28%; padding: 4px 6px; font-weight: bold; color: #444; font-size: 10px;">Full Name:</td>
        <td style="padding: 4px 6px; border-bottom: 1px solid #ccc; font-size: 11px;">{{customer_name}}</td>
        <td style="width: 20%; padding: 4px 6px; font-weight: bold; color: #444; font-size: 10px;">Phone:</td>
        <td style="padding: 4px 6px; border-bottom: 1px solid #ccc; font-size: 11px;">{{customer_phone}}</td>
      </tr>
      <tr>
        <td style="padding: 4px 6px; font-weight: bold; color: #444; font-size: 10px;">Billing Address:</td>
        <td colspan="3" style="padding: 4px 6px; border-bottom: 1px solid #ccc; font-size: 11px;">{{customer_address}}</td>
      </tr>
      <tr>
        <td style="padding: 4px 6px; font-weight: bold; color: #444; font-size: 10px;">Email:</td>
        <td style="padding: 4px 6px; border-bottom: 1px solid #ccc; font-size: 11px;">{{customer_email}}</td>
        <td style="padding: 4px 6px; font-weight: bold; color: #444; font-size: 10px;">Date of Birth:</td>
        <td style="padding: 4px 6px; border-bottom: 1px solid #ccc; font-size: 11px;">{{dob}}</td>
      </tr>
    </table>
  </div>

  <!-- Service Information -->
  <div style="margin-bottom: 16px;">
    <div style="background: #0F1D5E; color: white; padding: 5px 10px; font-weight: bold; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; border-radius: 2px;">Service Information</div>
    <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
      <tr>
        <td style="width: 28%; padding: 4px 6px; font-weight: bold; color: #444; font-size: 10px;">ESI ID:</td>
        <td style="padding: 4px 6px; border-bottom: 1px solid #ccc; font-size: 11px;">{{esi_id}}</td>
        <td style="width: 20%; padding: 4px 6px; font-weight: bold; color: #444; font-size: 10px;">Service Type:</td>
        <td style="padding: 4px 6px; border-bottom: 1px solid #ccc; font-size: 11px;">Switch</td>
      </tr>
      <tr>
        <td style="padding: 4px 6px; font-weight: bold; color: #444; font-size: 10px;">Service Address:</td>
        <td colspan="3" style="padding: 4px 6px; border-bottom: 1px solid #ccc; font-size: 11px;">{{service_address}}</td>
      </tr>
    </table>
  </div>

  <!-- Pricing Detail -->
  <div style="margin-bottom: 16px;">
    <div style="background: #0F1D5E; color: white; padding: 5px 10px; font-weight: bold; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; border-radius: 2px;">Pricing Detail Information</div>
    <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
      <tr>
        <td style="width: 28%; padding: 4px 6px; font-weight: bold; color: #444; font-size: 10px;">Energy Rate:</td>
        <td style="padding: 4px 6px; border-bottom: 1px solid #ccc; font-size: 11px;">{{rate}} ¢/kWh</td>
        <td style="width: 20%; padding: 4px 6px; font-weight: bold; color: #444; font-size: 10px;">Rate Type:</td>
        <td style="padding: 4px 6px; border-bottom: 1px solid #ccc; font-size: 11px;">Fixed</td>
      </tr>
      <tr>
        <td style="padding: 4px 6px; font-weight: bold; color: #444; font-size: 10px;">Contract Term:</td>
        <td style="padding: 4px 6px; border-bottom: 1px solid #ccc; font-size: 11px;">{{term_months}} Months</td>
        <td style="padding: 4px 6px; font-weight: bold; color: #444; font-size: 10px;">Monthly Svc Charge:</td>
        <td style="padding: 4px 6px; border-bottom: 1px solid #ccc; font-size: 11px;">$0.00</td>
      </tr>
      <tr>
        <td style="padding: 4px 6px; font-weight: bold; color: #444; font-size: 10px;">Energy Provider:</td>
        <td colspan="3" style="padding: 4px 6px; border-bottom: 1px solid #ccc; font-size: 11px;">{{rep_name}}</td>
      </tr>
      <tr>
        <td style="padding: 4px 6px; font-weight: bold; color: #444; font-size: 10px;">Plan Name:</td>
        <td colspan="3" style="padding: 4px 6px; border-bottom: 1px solid #ccc; font-size: 11px;">{{plan_name}}</td>
      </tr>
    </table>
  </div>

  <!-- Customer Authorization -->
  <div style="margin-bottom: 16px;">
    <div style="background: #0F1D5E; color: white; padding: 5px 10px; font-weight: bold; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; border-radius: 2px;">Customer Authorization</div>
    <div style="padding: 10px 6px; font-size: 9.5px; color: #333; line-height: 1.6;">
      <p>I, the undersigned, hereby authorize Saigon Power LLC (Broker) to act as my authorized agent in connection with the enrollment, switching, or renewal of my electricity service with the above referenced Retail Electric Provider (REP). I authorize Saigon Power LLC to submit all necessary paperwork and information to the REP on my behalf.</p>
      <p style="margin-top: 8px;">Customer appoints Saigon Power, LLC as agent to access accounts with Customer's current and prior REPs; obtain payment, billing, and usage history and update payment information (credit card / ACH); communicate with REPs on Customer's behalf; negotiate service agreements.</p>
      <p style="margin-top: 8px;">I understand that by signing this authorization form, I am agreeing to the pricing and terms detailed above. The rate is fixed for the stated contract term. This authorization is valid for the service address listed above.</p>
      <p style="margin-top: 8px;">I understand that if I cancel my service before the end of the contract term, I may be subject to an Early Termination Fee (ETF) of <strong>$150.00</strong> payable to the REP, as disclosed in the REP's Terms of Service. I have the right to rescind this authorization within three (3) business days of enrollment.</p>
      <p style="margin-top: 8px;">By signing below, I acknowledge that I have read and understood the terms of this authorization and agree to proceed with enrollment through Saigon Power LLC.</p>
    </div>
  </div>

  <!-- Signature Block -->
  <div style="margin-top: 24px; border-top: 1px solid #bbb; padding-top: 16px;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="width: 42%; padding: 4px 6px; vertical-align: bottom;">
          <div style="font-family: Georgia, serif; font-size: 18px; font-style: italic; border-bottom: 1.5px solid #000; min-height: 32px; padding-bottom: 2px; color: #111;">{{signature}}</div>
          <div style="font-size: 9px; color: #666; margin-top: 4px;">Customer Signature</div>
        </td>
        <td style="width: 4%;"></td>
        <td style="width: 30%; padding: 4px 6px; vertical-align: bottom;">
          <div style="font-size: 11px; border-bottom: 1.5px solid #000; min-height: 32px; padding-bottom: 2px; color: #111;">{{signature}}</div>
          <div style="font-size: 9px; color: #666; margin-top: 4px;">Printed Name</div>
        </td>
        <td style="width: 4%;"></td>
        <td style="width: 20%; padding: 4px 6px; vertical-align: bottom;">
          <div style="font-size: 11px; border-bottom: 1.5px solid #000; min-height: 32px; padding-bottom: 2px; color: #111;">{{date}}</div>
          <div style="font-size: 9px; color: #666; margin-top: 4px;">Date</div>
        </td>
      </tr>
      <tr>
        <td colspan="5" style="padding: 14px 6px 4px;">
          <span style="font-size: 10px; color: #555;">Agent: <strong>SGP</strong> &nbsp;&nbsp;&nbsp; Broker VID: <strong>319010</strong></span>
        </td>
      </tr>
    </table>
  </div>

  <!-- Footer -->
  <div style="margin-top: 16px; padding-top: 10px; border-top: 1px solid #eee; text-align: center; font-size: 9px; color: #aaa;">
    9999 Bellaire Blvd Suite 7E, Houston TX 77036 &nbsp;|&nbsp; power@saigonllc.com &nbsp;|&nbsp; Mon–Fri 9AM–6PM<br/>
    Saigon Power LLC &middot; Licensed Energy Broker &middot; Broker VID: 319010
  </div>
</div>`;

const MERGE_TAGS = [
  "{{customer_name}}","{{customer_address}}","{{customer_phone}}","{{customer_email}}",
  "{{dob}}","{{esi_id}}","{{service_address}}","{{rep_name}}","{{plan_name}}",
  "{{rate}}","{{term_months}}","{{est_monthly_bill}}","{{early_termination_fee}}",
  "{{signature}}","{{date}}",
];

const SAMPLE_DATA: Record<string, string> = {
  "{{customer_name}}": "John Smith",
  "{{customer_address}}": "123 Main St, Houston TX 77001",
  "{{customer_phone}}": "832-555-0100",
  "{{customer_email}}": "john@example.com",
  "{{dob}}": "01/15/1985",
  "{{esi_id}}": "1008901020030040050",
  "{{service_address}}": "123 Main St, Houston TX 77001",
  "{{rep_name}}": "Discount Power",
  "{{plan_name}}": "12-Month Fixed",
  "{{rate}}": "8.50",
  "{{term_months}}": "12",
  "{{early_termination_fee}}": "$150.00",
  "{{signature}}": "John Smith",
  "{{date}}": new Date().toLocaleDateString("en-US"),
};

function applyPreview(html: string): string {
  let out = html;
  for (const [tag, val] of Object.entries(SAMPLE_DATA)) {
    out = out.replaceAll(tag, val);
  }
  return out;
}

export default function ContractTemplatePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [html, setHtml]       = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (!authLoading && user && user.role !== "admin" && user.role !== "manager") {
      router.replace("/dashboard");
    }
  }, [user, authLoading]);

  useEffect(() => {
    api.getContractTemplate()
      .then((d: any) => setHtml(d.html_content || DEFAULT_TEMPLATE))
      .catch(() => setHtml(DEFAULT_TEMPLATE))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.updateContractTemplate(html);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return <div className="p-8 text-slate-400 text-sm">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F1D5E] flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#0F1D5E]">Contract Template</h1>
              <p className="text-sm text-slate-400">HTML template auto-populated with customer data on each proposal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setHtml(DEFAULT_TEMPLATE)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50">
              <RefreshCw className="w-3.5 h-3.5" /> Reset to Default
            </button>
            <button onClick={() => setPreview(!preview)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50">
              {preview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {preview ? "Edit" : "Preview"}
            </button>
            <button onClick={save} disabled={saving}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                saved ? "bg-emerald-100 text-emerald-700" : "bg-[#0F1D5E] text-white hover:bg-[#0F1D5E]/90"
              } disabled:opacity-50`}>
              <Save className="w-3.5 h-3.5" />
              {saved ? "Saved!" : saving ? "Saving..." : "Save Template"}
            </button>
          </div>
        </div>

        {/* Merge tags reference */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Available Merge Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {MERGE_TAGS.map(tag => (
              <code key={tag} onClick={() => navigator.clipboard.writeText(tag).catch(() => {})}
                className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-mono cursor-pointer hover:bg-blue-100 transition-colors"
                title="Click to copy">
                {tag}
              </code>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Click a tag to copy it. These are replaced with real data when a customer views their proposal.</p>
        </div>

        {/* Editor / Preview */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {preview ? (
            <div className="p-6">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Preview (sample data)</p>
              <div className="border border-slate-100 rounded-xl overflow-auto bg-white shadow-inner"
                dangerouslySetInnerHTML={{ __html: applyPreview(html) }} />
            </div>
          ) : (
            <textarea
              value={html}
              onChange={e => setHtml(e.target.value)}
              spellCheck={false}
              className="w-full h-[600px] font-mono text-xs p-5 focus:outline-none resize-none text-slate-700 leading-relaxed"
              placeholder="Paste your HTML contract template here..."
            />
          )}
        </div>

        <p className="text-xs text-slate-400 text-center pb-4">
          Changes saved here apply immediately to all new proposal acceptances.
        </p>
      </div>
    </div>
  );
}
