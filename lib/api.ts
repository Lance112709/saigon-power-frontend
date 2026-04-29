const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, {
    headers: { ...headers, ...(options.headers as Record<string, string> || {}) },
    ...options,
  });
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
  getCrmCustomer: (id: string) => request(`/api/v1/crm/customers/${id}`),
  updateCrmCustomer: (id: string, data: object) =>
    request(`/api/v1/crm/customers/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  createCrmDeal: (customerId: string, data: object) =>
    request(`/api/v1/crm/customers/${customerId}/deals`, { method: "POST", body: JSON.stringify(data) }),
  getCrmDeals: (params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return request(`/api/v1/crm/deals${q}`);
  },
  updateCrmDeal: (id: string, data: object) =>
    request(`/api/v1/crm/deals/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  getCrmDeal: (id: string) => request(`/api/v1/crm/deals/${id}`),
  deleteCrmDeal: (id: string) => request(`/api/v1/crm/deals/${id}`, { method: "DELETE" }),
  getCrmCustomerNotes: (id: string) => request(`/api/v1/crm/customers/${id}/notes`),
  createCrmCustomerNote: (id: string, data: object) =>
    request(`/api/v1/crm/customers/${id}/notes`, { method: "POST", body: JSON.stringify(data) }),
  deleteCrmCustomerNote: (id: string, noteId: string) =>
    request(`/api/v1/crm/customers/${id}/notes/${noteId}`, { method: "DELETE" }),
  getCrmDealNotes: (id: string) => request(`/api/v1/crm/deals/${id}/notes`),
  createCrmDealNote: (id: string, data: object) =>
    request(`/api/v1/crm/deals/${id}/notes`, { method: "POST", body: JSON.stringify(data) }),
  deleteCrmDealNote: (id: string, noteId: string) =>
    request(`/api/v1/crm/deals/${id}/notes/${noteId}`, { method: "DELETE" }),
  getCrmProviders: () => request("/api/v1/crm/providers"),
  getCrmAgents: () => request("/api/v1/crm/agents"),
  importCrmDeals: (file_path: string) =>
    request("/api/v1/crm/import", { method: "POST", body: JSON.stringify({ file_path }) }),

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
  getRunItems: (id: string, status?: string) =>
    request(`/api/v1/reconciliation/runs/${id}/items${status ? `?status=${status}` : ""}`),
  triggerReconciliation: (billing_month: string, supplier_id?: string) =>
    request(`/api/v1/reconciliation/run?billing_month=${billing_month}${supplier_id ? `&supplier_id=${supplier_id}` : ""}`, { method: "POST" }),
  resolveItem: (id: string, notes: string) =>
    request(`/api/v1/reconciliation/items/${id}?resolution_notes=${encodeURIComponent(notes)}&is_resolved=true`, { method: "PATCH" }),

  // AI Operations Agent (admin only)
  getAiDashboard: () => request("/api/v1/ai-agent/dashboard"),
  runAiScan: () => request("/api/v1/ai-agent/scan", { method: "POST" }),
  getAiAlerts: () => request("/api/v1/ai-agent/alerts"),
  resolveAiAlert: (id: string) => request(`/api/v1/ai-agent/alerts/${id}/resolve`, { method: "PATCH" }),
  triggerDailyReport: () => request("/api/v1/ai-agent/reports/daily", { method: "POST" }),
  triggerMonthlyReport: () => request("/api/v1/ai-agent/reports/monthly", { method: "POST" }),
  getAiReports: () => request("/api/v1/ai-agent/reports"),
  getDealsByAgent: (mode: "day" | "month", monthsBack?: number) =>
    request(`/api/v1/ai-agent/deals-by-agent?mode=${mode}&months_back=${monthsBack ?? 6}`),
  getAgentLeaderboard: () => request("/api/v1/ai-agent/leaderboard"),
  getPipeline: () => request("/api/v1/ai-agent/pipeline"),
  getReconciliationGap: () => request("/api/v1/ai-agent/reconciliation-gap"),
  getCommissionTracker: (monthsBack = 12) => request(`/api/v1/ai-agent/commission-tracker?months_back=${monthsBack}`),

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
};
