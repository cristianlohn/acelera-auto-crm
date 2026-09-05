import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  alternates: {
    canonical: siteConfig.url,
  },
  title: {
    default: `${siteConfig.name} | CRM Automotivo de Alta Velocidade`,
    template: `%s | ${siteConfig.name}`,
  },
  description:
    "CRM e Funil de Vendas projetado para lojas de veículos e concessionárias. Acelere o atendimento de leads do WhatsApp, organize o pátio e aumente o giro do estoque.",
  keywords: [
    "CRM automotivo",
    "gestão de leads veículos",
    "funil de vendas WhatsApp revenda",
    "sistema para concessionária",
    "estoque de veículos",
    "Acelera Auto",
  ],
  authors: [{ name: "Catuto Soluções Digitais" }],
  creator: "Catuto Soluções Digitais",
  publisher: "Catuto Soluções Digitais",
  openGraph: {
    title: `${siteConfig.name} | CRM Automotivo de Alta Velocidade`,
    description:
      "O CRM que acelera o fechamento de vendas de veículos. Funil Kanban integrado ao WhatsApp, gestão de pátio e métricas em tempo real.",
    url: siteConfig.url,
    siteName: siteConfig.name,
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: `${siteConfig.url}/og-image.png`,
        secureUrl: `${siteConfig.url}/og-image.png`,
        width: 1200,
        height: 630,
        type: "image/png",
        alt: `${siteConfig.name} Preview`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} | CRM Automotivo de Alta Velocidade`,
    description:
      "Acelere o fechamento de vendas de veículos e gerencie seus leads em tempo real.",
    images: [`${siteConfig.url}/og-image.png`],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Acelera Auto",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteConfig.url}/#organization`,
      name: "Catuto Soluções Digitais",
      legalName: siteConfig.company.legalName,
      url: siteConfig.url,
      logo: {
        "@type": "ImageObject",
        url: `${siteConfig.url}/logo.png`,
        width: 512,
        height: 512,
      },
      contactPoint: {
        "@type": "ContactPoint",
        email: siteConfig.company.supportEmail,
        contactType: "customer service",
        availableLanguage: ["Portuguese"],
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${siteConfig.url}/#software`,
      name: siteConfig.name,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web Browser",
      url: siteConfig.url,
      description:
        "CRM e Funil de Vendas projetado para lojas de veículos e concessionárias. Acelere o atendimento de leads do WhatsApp e controle seu estoque.",
      publisher: {
        "@id": `${siteConfig.url}/#organization`,
      },
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "BRL",
        lowPrice: "297.00",
        highPrice: "997.00",
        offerCount: "3",
      },
    },
  ],
};

import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/providers/query-provider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          id="schema-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground transition-colors duration-200">
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster position="top-right" richColors />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}