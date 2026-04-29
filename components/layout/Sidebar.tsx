"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, FileText, Upload, Building2, RefreshCw,
  UserPlus, UserCog, TrendingUp, Bell, PhoneCall, FileSignature,
  Shield, LogOut, UserCheck, Bot, XCircle, MessageSquare, Globe, Tag, Zap, CalendarClock, DollarSign,
} from "lucide-react";
import { useAuth, Role, PermAction } from "@/lib/auth";

interface NavItem {
  href: string;
  label: string;
  icon: any;
  roles?: Role[];
  perm?: PermAction;
}

const links: NavItem[] = [
  { href: "/dashboard",      label: "Dashboard",        icon: LayoutDashboard },
  { href: "/call-list",      label: "Who To Call Today", icon: PhoneCall },
  { href: "/tasks",          label: "Tasks & Follow-Ups", icon: Bell },
  { href: "/rates",          label: "Today's Rates",     icon: Tag },
  { href: "/forecast",       label: "Revenue Forecast",  icon: TrendingUp, perm: "view_forecast" },
  { href: "/uploads",        label: "Upload Statements", icon: Upload, perm: "view_uploads" },
  { href: "/reconciliation", label: "Reconciliation",    icon: RefreshCw, perm: "view_reconciliation" },
  { href: "/suppliers",      label: "Suppliers",         icon: Building2, roles: ["admin", "manager"] },
];

const crmLinks: NavItem[] = [
  { href: "/crm/leads",           label: "Leads",              icon: UserPlus,      perm: "view_all_leads" },
  { href: "/crm/converted",       label: "Customers",          icon: UserCheck,     perm: "view_all_leads" },
  { href: "/proposals",           label: "Proposals",          icon: FileSignature, perm: "view_proposals" },
  { href: "/crm/agents",          label: "Sales Agents",       icon: UserCog,       roles: ["admin", "manager"] },
  { href: "/crm/customers",       label: "Imported Customers", icon: Users,         perm: "view_all_customers" },
  { href: "/renewals",            label: "Renewals",           icon: CalendarClock, perm: "view_all_customers" },
  { href: "/crm/deals",           label: "All Deals",          icon: FileText,      perm: "view_all_deals" },
  { href: "/crm/dropped",         label: "Dropped Deals",      icon: XCircle,       perm: "view_all_deals" },
  { href: "/sms",                 label: "SMS",                icon: MessageSquare, roles: ["admin", "manager"] },
  { href: "/admin/landing-rates", label: "Landing Page Rates", icon: Globe,         roles: ["admin", "manager"] },
];

const roleBadge: Record<Role, string> = {
  admin:       "bg-red-500/25 text-red-300 border border-red-500/20",
  manager:     "bg-blue-500/25 text-blue-300 border border-blue-500/20",
  csr:         "bg-violet-500/25 text-violet-300 border border-violet-500/20",
  sales_agent: "bg-amber-500/25 text-amber-300 border border-amber-500/20",
};
const roleLabel: Record<Role, string> = {
  admin: "Admin", manager: "Manager", csr: "CSR", sales_agent: "Agent",
};

const avatarColor: Record<Role, string> = {
  admin:       "from-red-500 to-rose-600",
  manager:     "from-blue-500 to-indigo-600",
  csr:         "from-violet-500 to-purple-600",
  sales_agent: "from-amber-500 to-orange-500",
};

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout, loading, can } = useAuth();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [newLeadsCount, setNewLeadsCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const key = `leads_last_seen_${user.id || user.name}`;
    const lastSeen = localStorage.getItem(key) || new Date(0).toISOString();
    api.getNewLeadsCount(lastSeen)
      .then((res: any) => setNewLeadsCount(res?.count || 0))
      .catch(() => {});
  }, [user, pathname]);

  const canSee = (item: NavItem) => {
    if (!user) return false;
    if (item.perm) return can(item.perm);
    if (item.roles) return item.roles.includes(user.role);
    return true;
  };

  const isActive = (href: string) =>
    pathname === href ||
    (href !== "/" && href !== "/crm/leads" && href !== "/crm/converted" && pathname.startsWith(href)) ||
    (href === "/crm/leads" && (pathname === "/crm/leads" || pathname.startsWith("/crm/leads/"))) ||
    (href === "/crm/converted" && pathname === "/crm/converted");

  const NavLink = ({ href, label, icon: Icon, badge }: NavItem & { badge?: number }) => {
    const active = isActive(href);
    return (
      <Link href={href} className={`group relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
        active
          ? "bg-gradient-to-r from-emerald-500/20 to-emerald-400/10 text-emerald-300 shadow-sm"
          : "text-slate-400 hover:text-slate-100 hover:bg-white/5"
      }`}>
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-emerald-400 rounded-full" />
        )}
        <span className={`flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150 ${
          active ? "bg-emerald-500/20 text-emerald-400" : "text-slate-500 group-hover:text-slate-300"
        }`}>
          <Icon className="w-4 h-4 shrink-0" />
        </span>
        <span className="truncate flex-1">{label}</span>
        {badge != null && badge > 0 && (
          <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </Link>
    );
  };

  const SectionLabel = ({ children }: { children: string }) => (
    <div className="pt-5 pb-1.5 px-3">
      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{children}</p>
    </div>
  );

  const initials = user ? `${user.name?.split(" ")[0]?.[0] ?? ""}${user.name?.split(" ")[1]?.[0] ?? ""}`.toUpperCase() : "";

  return (
    <aside className="w-60 min-h-screen flex flex-col shrink-0 bg-[#0d1117] border-r border-white/[0.06]">

      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-900/40">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-black text-white tracking-tight leading-none">Saigon Power</p>
            <p className="text-[10px] text-slate-500 mt-0.5 leading-none">CRM Platform</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-0.5 scrollbar-hide">
        {links.filter(canSee).map(item => <NavLink key={item.href} {...item} />)}

        {crmLinks.filter(canSee).length > 0 && (
          <>
            <SectionLabel>CRM</SectionLabel>
            {crmLinks.filter(canSee).map(item => (
              <NavLink key={item.href} {...item} badge={item.href === "/crm/leads" ? newLeadsCount : undefined} />
            ))}
          </>
        )}

        {user?.role === "admin" && (
          <>
            <SectionLabel>Admin</SectionLabel>
            <NavLink href="/admin/users" label="User Management" icon={Shield} />
            <NavLink href="/admin/commissions" label="Commissions" icon={DollarSign} />
            <NavLink href="/admin/contract-template" label="Contract Template" icon={FileText} />
            <NavLink href="/admin/ai" label="AI Operations" icon={Bot} />
          </>
        )}
      </nav>

      {/* User card */}
      <div className="p-3 border-t border-white/[0.06]">
        {loading ? (
          <div className="h-14 rounded-xl bg-white/5 animate-pulse" />
        ) : user ? (
          <div className="rounded-xl bg-white/5 border border-white/[0.06] overflow-hidden">
            <div className="flex items-center gap-3 px-3 py-2.5">
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${avatarColor[user.role]} flex items-center justify-center text-white text-xs font-black shrink-0 shadow-lg`}>
                {initials || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate leading-tight">{user.name}</p>
                <span className={`inline-block mt-0.5 px-1.5 py-px rounded-md text-[10px] font-bold ${roleBadge[user.role]}`}>
                  {roleLabel[user.role]}
                </span>
              </div>
            </div>

            <div className="border-t border-white/[0.06] px-3 py-2">
              {confirmLogout ? (
                <div className="space-y-1.5">
                  <p className="text-[11px] text-slate-500">Sign out of CRM?</p>
                  <div className="flex gap-1.5">
                    <button onClick={logout}
                      className="flex-1 py-1 rounded-lg bg-red-500/20 text-red-300 text-[11px] font-bold hover:bg-red-500/30 transition-colors">
                      Yes
                    </button>
                    <button onClick={() => setConfirmLogout(false)}
                      className="flex-1 py-1 rounded-lg bg-white/5 text-slate-400 text-[11px] font-bold hover:bg-white/10 transition-colors">
                      No
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setConfirmLogout(true)}
                  className="flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-red-400 transition-colors">
                  <LogOut className="w-3 h-3" /> Sign out
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="px-3 py-2 text-xs text-slate-600">Broker VID: 319010</p>
        )}
      </div>
    </aside>
  );
}
