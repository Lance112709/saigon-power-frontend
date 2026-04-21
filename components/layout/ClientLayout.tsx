"use client";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import { AuthProvider } from "@/lib/auth";

const NO_LAYOUT = ["/login", "/change-password"];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const bare = NO_LAYOUT.some(p => pathname.startsWith(p));

  return (
    <AuthProvider>
      {bare ? (
        <div className="min-h-screen bg-[#F4F6FA]">{children}</div>
      ) : (
        <div className="flex min-h-screen bg-gray-50">
          <Sidebar />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      )}
    </AuthProvider>
  );
}
