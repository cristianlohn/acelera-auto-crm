import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Acelera Auto CRM",
    short_name: "Acelera Auto",
    description: "Gestão Inteligente de Leads e Estoque Automotivo",
    start_url: "/cockpit",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#f97316",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
