import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/layout/ClientLayout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Saigon Power",
  description: "Save on your Texas electricity — trusted energy broker for homes and businesses. Enroll online in minutes.",
  openGraph: {
    title: "Saigon Power",
    siteName: "Saigon Power",
    description: "Save on your Texas electricity — trusted energy broker for homes and businesses. Enroll online in minutes.",
    url: "https://saigonpowertx.com",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Saigon Power",
    description: "Save on your Texas electricity — trusted energy broker for homes and businesses.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
