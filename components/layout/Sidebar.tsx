"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, FileText, Upload, Building2, RefreshCw,
  UserPlus, UserCog, TrendingUp, Bell, PhoneCall, FileSignature,
  Shield, LogOut, UserCheck,
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
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/call-list", label: "Who To Call Today", icon: PhoneCall },
  { href: "/tasks", label: "Tasks & Follow-Ups", icon: Bell },
  { href: "/forecast", label: "Revenue Forecast", icon: TrendingUp, perm: "view_forecast" },
  { href: "/uploads", label: "Upload Statements", icon: Upload, perm: "view_uploads" },
  { href: "/reconciliation", label: "Reconciliation", icon: RefreshCw, perm: "view_reconciliation" },
  { href: "/suppliers", label: "Suppliers", icon: Building2, roles: ["admin", "manager"] },
];

const crmLinks: NavItem[] = [
  { href: "/crm/leads", label: "Leads", icon: UserPlus, perm: "view_all_leads" },
  { href: "/crm/converted", label: "Customers", icon: UserCheck, perm: "view_all_leads" },
  { href: "/proposals", label: "Proposals", icon: FileSignature, perm: "view_proposals" },
  { href: "/crm/agents", label: "Sales Agents", icon: UserCog, roles: ["admin", "manager"] },
  { href: "/crm/customers", label: "Imported Customers", icon: Users, perm: "view_all_customers" },
  { href: "/crm/deals", label: "All Deals", icon: FileText, perm: "view_all_deals" },
];

const roleBadge: Record<Role, string> = {
  admin: "bg-red-500/20 text-red-300",
  manager: "bg-blue-500/20 text-blue-300",
  csr: "bg-purple-500/20 text-purple-300",
  sales_agent: "bg-amber-500/20 text-amber-300",
};
const roleLabel: Record<Role, string> = {
  admin: "Admin",
  manager: "Manager",
  csr: "CSR",
  sales_agent: "Sales Agent",
};

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout, loading, can } = useAuth();

  const canSee = (item: NavItem) => {
    if (!user) return false;
    if (item.perm) return can(item.perm);
    if (item.roles) return item.roles.includes(user.role);
    return true;
  };

  const NavLink = ({ href, label, icon: Icon }: NavItem) => {
    const active = pathname === href || (href !== "/" && href !== "/crm/leads" && href !== "/crm/converted" && pathname.startsWith(href)) || (href === "/crm/leads" && (pathname === "/crm/leads" || pathname.startsWith("/crm/leads/"))) || (href === "/crm/converted" && pathname === "/crm/converted");
    return (
      <Link href={href} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        active ? "bg-green-600 text-white" : "text-gray-300 hover:bg-gray-800 hover:text-white"
      }`}>
        <Icon className="w-4 h-4 shrink-0" />
        {label}
      </Link>
    );
  };

  return (
    <aside className="w-60 min-h-screen bg-gray-900 text-white flex flex-col shrink-0">
      <div className="p-5 border-b border-gray-700">
        <h1 className="text-lg font-bold text-green-400">Saigon Power</h1>
        <p className="text-xs text-gray-500 mt-0.5">Commission Tracker</p>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {links.filter(canSee).map(item => <NavLink key={item.href} {...item} />)}

        <div className="pt-4 pb-1">
          <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">CRM</p>
        </div>
        {crmLinks.filter(canSee).map(item => <NavLink key={item.href} {...item} />)}

        {user?.role === "admin" && (
          <>
            <div className="pt-4 pb-1">
              <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Admin</p>
            </div>
            <NavLink href="/admin/users" label="User Management" icon={Shield} />
          </>
        )}
      </nav>

      <div className="p-3 border-t border-gray-700">
        {loading ? (
          <div className="px-4 py-2 text-xs text-gray-500">Loading...</div>
        ) : user ? (
          <div className="px-3 py-2.5 rounded-lg bg-gray-800/50">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
              </div>
              <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${roleBadge[user.role]}`}>
                {roleLabel[user.role]}
              </span>
            </div>
            <button onClick={logout}
              className="mt-2.5 flex items-center gap-2 text-xs text-gray-500 hover:text-red-400 transition-colors">
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
        ) : (
          <div className="px-4 py-2 text-xs text-gray-500">Broker VID: 319010</div>
        )}
      </div>
    </aside>
  );
}
