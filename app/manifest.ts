import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Saigon Power",
    short_name: "Saigon Power",
    description: "Your electricity plan, renewal reminders, and rates — Saigon Power.",
    start_url: "/my",
    display: "standalone",
    background_color: "#0a1a0e",
    theme_color: "#0a1a0e",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
