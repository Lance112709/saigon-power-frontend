import type { NextConfig } from "next";

// Origins the app legitimately talks to (API + Supabase storage/signed URLs).
const API = process.env.NEXT_PUBLIC_API_URL || "https://web-production-188939.up.railway.app";
const SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://larwckswepsgvtsdgthv.supabase.co";

// Content-Security-Policy. Next injects some inline bootstrap script/style, so
// 'unsafe-inline' is required for those to work; the value of this CSP is that
// it forbids loading scripts/frames from any *other* origin and blocks the page
// from being framed — meaningful defense-in-depth on top of output sanitization.
// HelcimPay.js (membership card payments) loads a script + checkout iframe
// from secure.helcim.app — card data goes straight to Helcim, never to us.
const HELCIM = "https://secure.helcim.app";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${HELCIM}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${API} ${SUPABASE} ${HELCIM}`,
  `frame-src 'self' ${HELCIM}`,
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    // the customer portal moved from /my to /myaccount (old links keep working)
    return [{ source: "/my", destination: "/myaccount", permanent: true }];
  },
};

export default nextConfig;
