import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "plus.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
      {
        protocol: "https",
        hostname: "vnxsmsgykirbgrjpwhc.supabase.co",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  // Impede o empacotamento de testes e relatórios nas lambdas da Vercel (redução de Function Storage)
  outputFileTracingExcludes: {
    "*": [
      "./e2e/**",
      "./test-results/**",
      "./playwright-report/**",
      "./src/__tests__/**",
      "./**/*.test.*",
      "./**/*.spec.*",
      "./**/*.md",
    ],
  },
  async redirects() {
    return [
      {
        source: "/bio",
        destination: "/?utm_source=instagram&utm_medium=bio&utm_campaign=perfil",
        permanent: false, // HTTP 307 (redirecionamento temporário para não fixar cache de UTM)
      },
      {
        source: "/insta",
        destination: "/?utm_source=instagram&utm_medium=bio&utm_campaign=perfil",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
