import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aceleraautocrm.com.br";

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login", "/register", "/cadastro", "/og-image.png"],
      disallow: [
        "/leads",
        "/vehicles",
        "/reports",
        "/clients",
        "/settings",
        "/superadmin",
        "/admin",
        "/api/*",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
