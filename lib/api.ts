const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      headers: { ...headers, ...(options.headers as Record<string, string> || {}) },
      ...options,
    });
  } catch {
    throw new Error("0:The server is unreachable. Please check your connection and try again in a moment.");
  }
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      window.location.href = "/login";
    }
    throw new Error(`${res.status}:${body || `Request failed: ${res.status}`}`);
  }
  return res.json();
}

export const api = {
  // Dashboard
  getDashboard: (month?: string) =>
    request(`/api/v1/dashboard/overview${month ? `?billing_month=${month}` : ""}`),
  getExpiringDeals: () => request("/api/v1/dashboard/expiring-deals"),
  getRenewals: (qs = "") => request(`/api/v1/renewals${qs}`),
  // Agent portal (self-service)
  getBusinessHealth: () => request("/api/v1/dashboard/business-health"),
  pollEmailStatements: () => request("/api/v1/uploads/poll-email", { method: "POST" }),
  emailContract: (proposalId: string, email?: string) =>
    request(`/api/v1/proposals/${proposalId}/email`, { method: "POST", body: JSON.stringify(email ? { email } : {}) }),
  emailRenewal: (source: string, dealId: string, email?: string) =>
    request("/api/v1/renewals/email", { method: "POST", body: JSON.stringify({ source, deal_id: dealId, ...(email ? { email } : {}) }) }),
  // Enrollments (admin)
  listEnrollments: (params: Record<string, string> = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/v1/enrollments${q ? `?${q}` : ""}`);
  },
  updateEnrollment: (id: string, data: any) =>
    request(`/api/v1/enrollments/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  dispatchEnrollment: (id: string, force = false) =>
    request(`/api/v1/enrollments/${id}/dispatch${force ? "?force=true" : ""}`, { method: "POST" }),
  listEnrollmentIntegrations: () => request("/api/v1/enrollments/integrations"),
  saveEnrollmentIntegration: (provider: string, data: any) =>
    request(`/api/v1/enrollments/integrations/${encodeURIComponent(provider)}`, { method: "PUT", body: JSON.stringify(data) }),
  previewEnrollmentIntegration: (provider: string) =>
    request(`/api/v1/enrollments/integrations/${encodeURIComponent(provider)}/preview`, { method: "POST" }),
  agentPortalOverview: (agent?: string) => request(`/api/v1/agent-portal/overview${agent ? `?agent=${encodeURIComponent(agent)}` : ""}`),
  agentPortalBook: (agent?: string) => request(`/api/v1/agent-portal/book${agent ? `?agent=${encodeURIComponent(agent)}` : ""}`),
  agentPortalCommissions: (agent?: string) => request(`/api/v1/agent-portal/commissions${agent ? `?agent=${encodeURIComponent(agent)}` : ""}`),
  agentPortalBreakdown: (id: string, agent?: string) => request(`/api/v1/agent-portal/commissions/${id}/breakdown${agent ? `?agent=${encodeURIComponent(agent)}` : ""}`),
  agentPortalAlerts: (agent?: string) => request(`/api/v1/agent-portal/alerts${agent ? `?agent=${encodeURIComponent(agent)}` : ""}`),
  agentPortalEarnings: (agent?: string) => request(`/api/v1/agent-portal/earnings${agent ? `?agent=${encodeURIComponent(agent)}` : ""}`),

  // SGP Agent Commission (tier structure)
  sgpAgents: (params?: { classification?: string; agreement_status?: string; tier?: number; q?: string }) => {
    const p = new URLSearchParams();
    if (params?.classification) p.set("classification", params.classification);
    if (params?.agreement_status) p.set("agreement_status", params.agreement_status);
    if (params?.tier !== undefined) p.set("tier", String(params.tier));
    if (params?.q) p.set("q", params.q);
    const qs = p.toString();
    return request(`/api/v1/sgp/agents${qs ? `?${qs}` : ""}`);
  },
  sgpAgent: (id: string) => request(`/api/v1/sgp/agents/${id}`),
  sgpUpdateAgent: (id: string, body: Record<string, unknown>) =>
    request(`/api/v1/sgp/agents/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  sgpOverrideTier: (id: string, body: { tier: number; reason: string; effective_from?: string }) =>
    request(`/api/v1/sgp/agents/${id}/override-tier`, { method: "POST", body: JSON.stringify(body) }),
  sgpEvaluate: (body?: { agent_id?: string; backfill_from?: string }) =>
    request("/api/v1/sgp/evaluate", { method: "POST", body: JSON.stringify(body || {}) }),
  sgpSettings: () => request("/api/v1/sgp/settings"),
  sgpUpdateSettings: (body: { qualification_basis?: string; promotion_effective_rule?: string }) =>
    request("/api/v1/sgp/settings", { method: "PATCH", body: JSON.stringify(body) }),
  sgpTiers: () => request("/api/v1/sgp/tiers"),
  getCommissionForecast: () => request("/api/v1/dashboard/commission-forecast"),
  getRenewalFilters: () => request("/api/v1/renewals/filters"),
  getLeadsStats: () => request("/api/v1/dashboard/leads-stats"),
  getCommissionHistory: () => request("/api/v1/dashboard/commission-history"),
  getRevenueForecast: () => request("/api/v1/dashboard/revenue-forecast"),
  getSupplierBreakdown: (month?: string) =>
    request(`/api/v1/dashboard/supplier-breakdown${month ? `?billing_month=${month}` : ""}`),

  // Suppliers
  getSuppliers: () => request("/api/v1/suppliers"),
  createSupplier: (data: object) => request("/api/v1/suppliers", { method: "POST", body: JSON.stringify(data) }),
  updateSupplier: (id: string, data: object) => request(`/api/v1/suppliers/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  // Customers
  getCustomers: (search?: string) =>
    request(`/api/v1/customers${search ? `?search=${search}` : ""}`),
  getCustomer: (id: string) => request(`/api/v1/customers/${id}`),
  createCustomer: (data: object) => request("/api/v1/customers", { method: "POST", body: JSON.stringify(data) }),

  // Contracts
  getContracts: (params?: object) => {
    const q = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
    return request(`/api/v1/contracts${q}`);
  },
  createContract: (data: object) => request("/api/v1/contracts", { method: "POST", body: JSON.stringify(data) }),

  // Commissions
  getExpected: (billing_month?: string, supplier_id?: string) => {
    const params = new URLSearchParams();
    if (billing_month) params.set("billing_month", billing_month);
    if (supplier_id) params.set("supplier_id", supplier_id);
    return request(`/api/v1/commissions/expected?${params}`);
  },
  getActual: (billing_month?: string) =>
    request(`/api/v1/commissions/actual${billing_month ? `?billing_month=${billing_month}` : ""}`),

  // Uploads
  getUploads: () => request("/api/v1/uploads"),
  uploadFile: (formData: FormData) => {
    const token = getToken();
    return fetch(`${API_URL}/api/v1/uploads`, {
      method: "POST",
      body: formData,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then(r => r.json());
  },

  // CRM
  getCrmStats: () => request("/api/v1/crm/stats"),
  getCrmCustomers: (params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return request(`/api/v1/crm/customers${q}`);
  },
  getCrmCustomersCount: (params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return request(`/api/v1/crm/customers/count${q}`);
  },
  getCrmCustomer: (id: string) => request(`/api/v1/crm/customers/${id}`),
  updateCrmCustomer: (id: string, data: object) =>
    request(`/api/v1/crm/customers/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  createCrmDeal: (customerId: string, data: object) =>
    request(`/api/v1/crm/customers/${customerId}/deals`, { method: "POST", body: JSON.stringify(data) }),
  checkDuplicateDeal: (params: { esiid?: string; service_address?: string; active_only?: boolean }) => {
    const q = new URLSearchParams();
    if (params.esiid) q.set("esiid", params.esiid);
    if (params.service_address) q.set("service_address", params.service_address);
    if (params.active_only) q.set("active_only", "true");
    return request(`/api/v1/crm/deals/check-duplicate?${q.toString()}`);
  },
  getCrmDeals: (params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return request(`/api/v1/crm/deals${q}`);
  },
  updateCrmDeal: (id: string, data: object) =>
    request(`/api/v1/crm/deals/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  getCrmDeal: (id: string) => request(`/api/v1/crm/deals/${id}`),
  deleteCrmDeal: (id: string) => request(`/api/v1/crm/deals/${id}`, { method: "DELETE" }),
  renewCrmDeal: (id: string, data: object) =>
    request(`/api/v1/crm/deals/${id}/renew`, { method: "POST", body: JSON.stringify(data) }),
  getCrmCustomerNotes: (id: string) => request(`/api/v1/crm/customers/${id}/notes`),
  createCrmCustomerNote: (id: string, data: object) =>
    request(`/api/v1/crm/customers/${id}/notes`, { method: "POST", body: JSON.stringify(data) }),
  deleteCrmCustomerNote: (id: string, noteId: string) =>
    request(`/api/v1/crm/customers/${id}/notes/${noteId}`, { method: "DELETE" }),
  getCrmCustomerAttachments: (id: string) => request(`/api/v1/crm/customers/${id}/attachments`),
  uploadCrmCustomerAttachment: (id: string, file: File) => {
    const token = getToken();
    const form = new FormData();
    form.append("file", file);
    return fetch(`${API_URL}/api/v1/crm/customers/${id}/attachments`, {
      method: "POST",
      body: form,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then(async r => {
      if (!r.ok) throw new Error(`${r.status}:${await r.text()}`);
      return r.json();
    });
  },
  getCrmAttachmentUrl: (id: string, attachmentId: string) =>
    request(`/api/v1/crm/customers/${id}/attachments/${attachmentId}/url`),
  deleteCrmCustomerAttachment: (id: string, attachmentId: string) =>
    request(`/api/v1/crm/customers/${id}/attachments/${attachmentId}`, { method: "DELETE" }),
  getCrmDealNotes: (id: string) => request(`/api/v1/crm/deals/${id}/notes`),
  createCrmDealNote: (id: string, data: object) =>
    request(`/api/v1/crm/deals/${id}/notes`, { method: "POST", body: JSON.stringify(data) }),
  deleteCrmDealNote: (id: string, noteId: string) =>
    request(`/api/v1/crm/deals/${id}/notes/${noteId}`, { method: "DELETE" }),
  getCommissionPayments: (params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/v1/commission-payments?${qs}`);
  },
  getUnmatchedCommissionPayments: () => request("/api/v1/commission-payments/unmatched"),
  getCrmCustomerSources: () => request("/api/v1/crm/customers/sources"),
  getCrmProviders: () => request("/api/v1/crm/providers"),
  getCrmAgents: () => request("/api/v1/crm/agents"),
  importCrmDeals: (file_path: string) =>
    request("/api/v1/crm/import", { method: "POST", body: JSON.stringify({ file_path }) }),
  getCrmImportTemplate: async () => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    const res = await fetch(`${API_URL}/api/v1/crm/import-template`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error("Failed to download template");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "crm_import_template.xlsx"; a.click();
    URL.revokeObjectURL(url);
  },
  // ── CSV exports (admin) ──
  downloadCsv: async (path: string, params?: Record<string, string>, filename = "export.csv") => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    const qs = params && Object.keys(params).length ? "?" + new URLSearchParams(params).toString() : "";
    const res = await fetch(`${API_URL}${path}${qs}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) throw new Error(res.status === 403 ? "Admin access required." : "Export failed.");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  },
  exportRenewals: (params?: Record<string, string>) =>
    api.downloadCsv("/api/v1/renewals/export", params, `renewals_${new Date().toISOString().slice(0, 10)}.csv`),
  exportImportedCustomers: (params?: Record<string, string>) =>
    api.downloadCsv("/api/v1/crm/customers/export", params, `imported_customers_${new Date().toISOString().slice(0, 10)}.csv`),
  exportConvertedCustomers: (params?: Record<string, string>) =>
    api.downloadCsv("/api/v1/leads/customers/export", params, `customers_${new Date().toISOString().slice(0, 10)}.csv`),
  exportDeals: (params?: Record<string, string>) =>
    api.downloadCsv("/api/v1/crm/deals/export", params, `deals_${new Date().toISOString().slice(0, 10)}.csv`),
  exportLeadDeals: (params?: Record<string, string>) =>
    api.downloadCsv("/api/v1/leads/all-deals/export", params, `lead_deals_${new Date().toISOString().slice(0, 10)}.csv`),
  exportLeads: (params?: Record<string, string>) =>
    api.downloadCsv("/api/v1/leads/export", params, `leads_${new Date().toISOString().slice(0, 10)}.csv`),

  // ── Commercial Pricing ──
  getCurrentPricing: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request(`/api/v1/commercial-pricing/current${qs}`);
  },
  getCurrentPricingVersion: () => request("/api/v1/commercial-pricing/current/version"),
  getPricingDashboard: () => request("/api/v1/commercial-pricing/dashboard"),
  pollPricingEmail: () => request("/api/v1/commercial-pricing/poll-email", { method: "POST" }),
  getPricingHistory: () => request("/api/v1/commercial-pricing/history"),
  getPricingProviders: () => request("/api/v1/commercial-pricing/providers"),
  addPricingProvider: (payload: any) => request("/api/v1/commercial-pricing/providers", { method: "POST", body: JSON.stringify(payload) }),
  updatePricingProvider: (id: string, payload: any) => request(`/api/v1/commercial-pricing/providers/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  getPricingUploadPreview: (id: string) => request(`/api/v1/commercial-pricing/uploads/${id}/preview`),
  publishPricingUpload: (id: string) => request(`/api/v1/commercial-pricing/uploads/${id}/publish`, { method: "POST" }),
  uploadPricingMatrix: async (providerCode: string, file: File) => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    const form = new FormData();
    form.append("provider_code", providerCode);
    form.append("file", file);
    const res = await fetch(`${API_URL}/api/v1/commercial-pricing/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) { const b = await res.text(); throw new Error(b); }
    return res.json();
  },
  importCrmExcel: async (file: File) => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_URL}/api/v1/crm/import-upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) { const b = await res.text(); throw new Error(b); }
    return res.json();
  },
  clearCrmData: () => request("/api/v1/crm/clear", { method: "DELETE" }),
  deduplicateCrmDeals: () => request("/api/v1/crm/deduplicate-deals", { method: "POST" }),

  // GiaDienRe website subscriptions
  getGdrSubscriptions: (params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return request(`/api/v1/giadienre/subscriptions${q}`);
  },
  getGdrStats: (params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return request(`/api/v1/giadienre/subscriptions/stats${q}`);
  },
  getGdrNewCount: (since: string) =>
    request(`/api/v1/giadienre/subscriptions/new-count?since=${encodeURIComponent(since)}`),
  getGdrSubscription: (id: string) => request(`/api/v1/giadienre/subscriptions/${id}`),
  updateGdrSubscription: (id: string, data: any) =>
    request(`/api/v1/giadienre/subscriptions/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  getGdrNotes: (id: string) => request(`/api/v1/giadienre/subscriptions/${id}/notes`),
  createGdrNote: (id: string, data: any) =>
    request(`/api/v1/giadienre/subscriptions/${id}/notes`, { method: "POST", body: JSON.stringify(data) }),
  deleteGdrNote: (id: string, noteId: string) =>
    request(`/api/v1/giadienre/subscriptions/${id}/notes/${noteId}`, { method: "DELETE" }),

  // Leads
  getAllLeadDeals: (params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return request(`/api/v1/leads/all-deals${q}`);
  },
  getNewLeadsCount: (since: string) =>
    request(`/api/v1/leads?created_after=${encodeURIComponent(since)}&count_only=true`),
  getLeads: (params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return request(`/api/v1/leads${q}`);
  },
  createLead: (data: object) =>
    request("/api/v1/leads", { method: "POST", body: JSON.stringify(data) }),
  getLead: (id: string) => request(`/api/v1/leads/${id}`),
  updateLead: (id: string, data: object) =>
    request(`/api/v1/leads/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  createLeadDeal: (leadId: string, data: object) =>
    request(`/api/v1/leads/${leadId}/deals`, { method: "POST", body: JSON.stringify(data) }),
  updateLeadDeal: (leadId: string, dealId: string, data: object) =>
    request(`/api/v1/leads/${leadId}/deals/${dealId}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteLeadDeal: (leadId: string, dealId: string) =>
    request(`/api/v1/leads/${leadId}/deals/${dealId}`, { method: "DELETE" }),
  getLeadNotes: (leadId: string) => request(`/api/v1/leads/${leadId}/notes`),
  createLeadNote: (leadId: string, data: object) =>
    request(`/api/v1/leads/${leadId}/notes`, { method: "POST", body: JSON.stringify(data) }),
  updateLeadNote: (leadId: string, noteId: string, content: string) =>
    request(`/api/v1/leads/${leadId}/notes/${noteId}`, { method: "PATCH", body: JSON.stringify({ content }) }),
  deleteLeadNote: (leadId: string, noteId: string) =>
    request(`/api/v1/leads/${leadId}/notes/${noteId}`, { method: "DELETE" }),
  getLeadAttachments: (leadId: string) => request(`/api/v1/leads/${leadId}/attachments`),
  uploadLeadAttachment: (leadId: string, file: File) => {
    const token = getToken();
    const form = new FormData();
    form.append("file", file);
    return fetch(`${API_URL}/api/v1/leads/${leadId}/attachments`, {
      method: "POST",
      body: form,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then(async r => {
      if (!r.ok) throw new Error(`${r.status}:${await r.text()}`);
      return r.json();
    });
  },
  getLeadAttachmentUrl: (leadId: string, attachmentId: string) =>
    request(`/api/v1/leads/${leadId}/attachments/${attachmentId}/url`),
  deleteLeadAttachment: (leadId: string, attachmentId: string) =>
    request(`/api/v1/leads/${leadId}/attachments/${attachmentId}`, { method: "DELETE" }),
  getSalesAgents: () => request("/api/v1/leads/agents"),
  createSalesAgent: (data: object) =>
    request("/api/v1/leads/agents", { method: "POST", body: JSON.stringify(data) }),
  updateSalesAgent: (id: string, data: object) =>
    request(`/api/v1/leads/agents/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteSalesAgent: (id: string) =>
    request(`/api/v1/leads/agents/${id}`, { method: "DELETE" }),
  getLeadCustomers: (params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return request(`/api/v1/leads/customers${q}`);
  },
  getLeadCustomersCount: (params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return request(`/api/v1/leads/customers/count${q}`);
  },
  getLeadCustomerFilterOptions: () => request("/api/v1/leads/customers/filter-options"),
  deleteLead: (id: string) => request(`/api/v1/leads/${id}`, { method: "DELETE" }),
  backfillSgpIds: () => request("/api/v1/leads/backfill-sgp-ids", { method: "POST" }),
  getDroppedDeals: (params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return request(`/api/v1/leads/dropped-deals${q}`);
  },
  deleteCrmCustomer: (id: string) => request(`/api/v1/crm/customers/${id}`, { method: "DELETE" }),

  // Tasks
  getTaskStats: () => request("/api/v1/tasks/stats"),
  getTasks: (params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return request(`/api/v1/tasks${q}`);
  },
  createTask: (data: object) => request("/api/v1/tasks", { method: "POST", body: JSON.stringify(data) }),
  updateTask: (id: string, data: object) => request(`/api/v1/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteTask: (id: string) => request(`/api/v1/tasks/${id}`, { method: "DELETE" }),

  // Proposals
  createProposal: (data: object) =>
    request("/api/v1/proposals", { method: "POST", body: JSON.stringify(data) }),
  getProposals: (params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return request(`/api/v1/proposals${q}`);
  },
  getProposal: (id: string) => request(`/api/v1/proposals/${id}`),
  updateProposal: (id: string, data: object) =>
    request(`/api/v1/proposals/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  getProposalByToken: (token: string) => request(`/api/v1/proposals/view/${token}`),
  acceptProposal: (token: string, data: object) =>
    request(`/api/v1/proposals/accept/${token}`, { method: "POST", body: JSON.stringify(data) }),

  // Agent Commissions (admin only)
  listAgentCommissions: (params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return request(`/api/v1/agent-commissions${q}`);
  },
  calculateAgentCommissions: (data: { month: number; year: number }) =>
    request("/api/v1/agent-commissions/calculate", { method: "POST", body: JSON.stringify(data) }),
  approveAgentCommission: (id: string, data?: object) =>
    request(`/api/v1/agent-commissions/${id}/approve`, { method: "PATCH", body: JSON.stringify(data || {}) }),
  closeOutAgentCommission: (id: string, data?: object) =>
    request(`/api/v1/agent-commissions/${id}/close-out`, { method: "PATCH", body: JSON.stringify(data || {}) }),
  markAgentCommissionPaid: (id: string, data?: object) =>
    request(`/api/v1/agent-commissions/${id}/mark-paid`, { method: "PATCH", body: JSON.stringify(data || {}) }),
  getAgentCommissionBreakdown: (id: string) =>
    request(`/api/v1/agent-commissions/${id}/breakdown`),
  getCommissionLogs: (params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return request(`/api/v1/agent-commissions/logs${q}`);
  },

  // Users (admin only)
  getUsers: () => request("/api/v1/users"),
  createUser: (data: object) => request("/api/v1/users", { method: "POST", body: JSON.stringify(data) }),
  updateUser: (id: string, data: object) => request(`/api/v1/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  resetUserPassword: (id: string) => request(`/api/v1/users/${id}/reset-password`, { method: "POST" }),
  deleteUser: (id: string) => request(`/api/v1/users/${id}`, { method: "DELETE" }),
  getAllPermissions: () => request("/api/v1/users/permissions"),
  updatePermission: (role: string, permission: string, granted: boolean) =>
    request("/api/v1/users/permissions", { method: "PATCH", body: JSON.stringify({ role, permission, granted }) }),

  // Call List
  getCallList: (params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return request(`/api/v1/call-list${q}`);
  },

  // Landing Plans
  getLandingPlans: () => request("/api/v1/landing-plans"),
  updateLandingPlan: (id: number, data: object) =>
    request(`/api/v1/landing-plans/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  // Contract Templates
  getContractTemplate: () => request("/api/v1/contracts/template"),
  updateContractTemplate: (html_content: string) =>
    request("/api/v1/contracts/template", { method: "PATCH", body: JSON.stringify({ html_content }) }),
  storeSignedContract: (token: string, pdfBlob: Blob) => {
    const formData = new FormData();
    formData.append("file", pdfBlob, "contract.pdf");
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const stored = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    return fetch(`${API_URL}/api/v1/contracts/store/${token}`, { method: "POST", body: formData }).then(r => r.json());
  },
  getSignedContractUrl: (token: string) => request(`/api/v1/contracts/signed-url/${token}`),

  // Reconciliation
  getRuns: () => request("/api/v1/reconciliation/runs"),
  getRun: (id: string) => request(`/api/v1/reconciliation/runs/${id}`),
  getRunItems: (id: string, status?: string, severity?: string, isResolved?: boolean) => {
    const p = new URLSearchParams();
    if (status) p.set("status", status);
    if (severity) p.set("severity", severity);
    if (isResolved !== undefined) p.set("is_resolved", String(isResolved));
    const qs = p.toString();
    return request(`/api/v1/reconciliation/runs/${id}/items${qs ? `?${qs}` : ""}`);
  },
  triggerReconciliation: (billing_month: string, supplier_id?: string) =>
    request(`/api/v1/reconciliation/run?billing_month=${billing_month}${supplier_id ? `&supplier_id=${supplier_id}` : ""}`, { method: "POST" }),
  resolveItem: (id: string, notes: string) =>
    request(`/api/v1/reconciliation/items/${id}?resolution_notes=${encodeURIComponent(notes)}&is_resolved=true`, { method: "PATCH" }),
  bulkResolveItems: (itemIds: string[], notes: string) =>
    request("/api/v1/reconciliation/items/bulk-resolve", {
      method: "POST",
      body: JSON.stringify({ item_ids: itemIds, resolution_notes: notes }),
    }),

  // Commission Intelligence: audit findings, exception cases, snapshots
  getAuditFindings: (params?: { billing_month?: string; supplier_id?: string; status?: string }) => {
    const p = new URLSearchParams();
    if (params?.billing_month) p.set("billing_month", params.billing_month);
    if (params?.supplier_id) p.set("supplier_id", params.supplier_id);
    if (params?.status) p.set("status", params.status);
    const qs = p.toString();
    return request(`/api/v1/reconciliation/findings${qs ? `?${qs}` : ""}`);
  },
  updateFinding: (id: string, patch: { status?: string; notes?: string }) =>
    request(`/api/v1/reconciliation/findings/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  getExceptionCases: (params?: { workflow_status?: string; supplier_id?: string; billing_month?: string; issue_type?: string; min_loss?: number }) => {
    const p = new URLSearchParams();
    if (params?.workflow_status) p.set("workflow_status", params.workflow_status);
    if (params?.supplier_id) p.set("supplier_id", params.supplier_id);
    if (params?.billing_month) p.set("billing_month", params.billing_month);
    if (params?.issue_type) p.set("issue_type", params.issue_type);
    if (params?.min_loss !== undefined) p.set("min_loss", String(params.min_loss));
    const qs = p.toString();
    return request(`/api/v1/reconciliation/cases${qs ? `?${qs}` : ""}`);
  },
  updateExceptionCase: (id: string, patch: { workflow_status?: string; notes?: string; recovered_amount?: number }) =>
    request(`/api/v1/reconciliation/cases/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  bulkUpdateCases: (caseIds: string[], workflowStatus: string, notes?: string) =>
    request("/api/v1/reconciliation/cases/bulk-update", {
      method: "POST",
      body: JSON.stringify({ case_ids: caseIds, workflow_status: workflowStatus, notes: notes || "" }),
    }),
  getSnapshotHistory: (esiid: string, supplierId?: string) =>
    request(`/api/v1/reconciliation/snapshots?esiid=${encodeURIComponent(esiid)}${supplierId ? `&supplier_id=${supplierId}` : ""}`),

  // Commission rules (versioned, per provider)
  getCommissionRules: (supplierId?: string) =>
    request(`/api/v1/commission-rules${supplierId ? `?supplier_id=${supplierId}` : ""}`),
  getCommissionRuleHistory: (supplierId: string) =>
    request(`/api/v1/commission-rules/history?supplier_id=${supplierId}`),
  createCommissionRule: (body: { supplier_id: string; name?: string; rule_type: string; config: Record<string, unknown>; effective_from: string; notes?: string }) =>
    request("/api/v1/commission-rules", { method: "POST", body: JSON.stringify(body) }),
  previewCommissionRule: (body: { rule_type: string; config: Record<string, unknown>; samples: { kwh?: number; adder?: number }[] }) =>
    request("/api/v1/commission-rules/preview", { method: "POST", body: JSON.stringify(body) }),

  // Disputes
  getDisputes: (status?: string) =>
    request(`/api/v1/disputes${status ? `?status=${status}` : ""}`),
  getDispute: (id: string) => request(`/api/v1/disputes/${id}`),
  createDispute: (body: { supplier_id: string; case_ids?: string[]; finding_id?: string; title?: string }) =>
    request("/api/v1/disputes", { method: "POST", body: JSON.stringify(body) }),
  editDispute: (id: string, patch: { title?: string; email_to?: string; email_subject?: string; email_body?: string; notes?: string }) =>
    request(`/api/v1/disputes/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  sendDispute: (id: string) => request(`/api/v1/disputes/${id}/send`, { method: "POST" }),
  recordDisputeOutcome: (id: string, body: { status: string; recovered_amount?: number; notes?: string }) =>
    request(`/api/v1/disputes/${id}/outcome`, { method: "POST", body: JSON.stringify(body) }),

  // Executive commission-intelligence dashboard
  getCommissionIntelligence: (billingMonth?: string) =>
    request(`/api/v1/dashboard/commission-intelligence${billingMonth ? `?billing_month=${billingMonth}` : ""}`),
  getProviderScorecards: (months = 6) =>
    request(`/api/v1/dashboard/provider-scorecards?months=${months}`),

  // AI Operations Agent (admin only)
  getAiDashboard: () => request("/api/v1/ai-agent/dashboard"),
  getAiCommandCenter: () => request("/api/v1/ai-agent/command-center"),
  runAiScan: () => request("/api/v1/ai-agent/scan", { method: "POST" }),
  getAiAlerts: () => request("/api/v1/ai-agent/alerts"),
  getAiAlertsCount: () => request("/api/v1/ai-agent/alerts/count"),
  resolveAiAlert: (id: string) => request(`/api/v1/ai-agent/alerts/${id}/resolve`, { method: "PATCH" }),
  triggerDailyReport: () => request("/api/v1/ai-agent/reports/daily", { method: "POST" }),
  triggerMonthlyReport: () => request("/api/v1/ai-agent/reports/monthly", { method: "POST" }),
  getAiReports: () => request("/api/v1/ai-agent/reports"),
  getDealsByAgent: (mode: "day" | "month", monthsBack?: number, dateFrom?: string, dateTo?: string) => {
    const p = new URLSearchParams({ mode, months_back: String(monthsBack ?? 6) });
    if (dateFrom) p.set("date_from", dateFrom);
    if (dateTo)   p.set("date_to",   dateTo);
    return request(`/api/v1/ai-agent/deals-by-agent?${p.toString()}`);
  },
  getDealsByAgentDetails: (agent: string, dateFrom?: string, dateTo?: string) => {
    const p = new URLSearchParams({ agent });
    if (dateFrom) p.set("date_from", dateFrom);
    if (dateTo)   p.set("date_to",   dateTo);
    return request(`/api/v1/ai-agent/deals-by-agent/details?${p.toString()}`);
  },
  getDupAddresses: () => request("/api/v1/ai-agent/data-quality/dup-addresses"),
  getDupEsiids:    () => request("/api/v1/ai-agent/data-quality/dup-esiids"),
  getAgentLeaderboard: () => request("/api/v1/ai-agent/leaderboard"),
  getPipeline: () => request("/api/v1/ai-agent/pipeline"),
  getReconciliationGap: () => request("/api/v1/ai-agent/reconciliation-gap"),
  getCommissionTracker: (monthsBack = 12) => request(`/api/v1/ai-agent/commission-tracker?months_back=${monthsBack}`),
  sendAiChat: (message: string, history: { role: string; content: string }[]) =>
    request("/api/v1/ai-agent/chat", { method: "POST", body: JSON.stringify({ message, history }) }),

  // SMS
  sendSms: (data: object) => request("/api/v1/sms/send", { method: "POST", body: JSON.stringify(data) }),
  getSmsLogs: (params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return request(`/api/v1/sms/logs${q}`);
  },
  getSmsTemplates: () => request("/api/v1/sms/templates"),
  createSmsTemplate: (data: object) => request("/api/v1/sms/templates", { method: "POST", body: JSON.stringify(data) }),
  updateSmsTemplate: (id: string, data: object) => request(`/api/v1/sms/templates/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteSmsTemplate: (id: string) => request(`/api/v1/sms/templates/${id}`, { method: "DELETE" }),
  toggleLeadSmsOptOut: (leadId: string, optOut: boolean) =>
    request(`/api/v1/sms/opt-out/lead/${leadId}`, { method: "POST", body: JSON.stringify({ opt_out: optOut }) }),
  toggleCustomerSmsOptOut: (customerId: string, optOut: boolean) =>
    request(`/api/v1/sms/opt-out/customer/${customerId}`, { method: "POST", body: JSON.stringify({ opt_out: optOut }) }),

  // ── Customer email ──
  sendEmail: (data: object) => request("/api/v1/email/send", { method: "POST", body: JSON.stringify(data) }),
  previewEmail: (data: object) => request("/api/v1/email/preview", { method: "POST", body: JSON.stringify(data) }),
  getEmailLogs: (params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return request(`/api/v1/email/logs${q}`);
  },
  getEmailMergeVars: (params: Record<string, string>) =>
    request(`/api/v1/email/merge-vars?${new URLSearchParams(params).toString()}`),
  getEmailTemplates: () => request("/api/v1/email/templates"),
  createEmailTemplate: (data: object) => request("/api/v1/email/templates", { method: "POST", body: JSON.stringify(data) }),
  updateEmailTemplate: (id: string, data: object) => request(`/api/v1/email/templates/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteEmailTemplate: (id: string) => request(`/api/v1/email/templates/${id}`, { method: "DELETE" }),

  // Bulk email campaigns
  createCampaign: (data: object) => request("/api/v1/email/campaigns", { method: "POST", body: JSON.stringify(data) }),
  getCampaigns: () => request("/api/v1/email/campaigns"),
  getCampaign: (id: string) => request(`/api/v1/email/campaigns/${id}`),
  pauseCampaign: (id: string) => request(`/api/v1/email/campaigns/${id}/pause`, { method: "POST" }),
  resumeCampaign: (id: string) => request(`/api/v1/email/campaigns/${id}/resume`, { method: "POST" }),
  cancelCampaign: (id: string) => request(`/api/v1/email/campaigns/${id}/cancel`, { method: "POST" }),

  globalSearch: (q: string) => request(`/api/v1/search?q=${encodeURIComponent(q)}`),
};
