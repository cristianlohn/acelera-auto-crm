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

export const metadata: Metadata = {
  metadataBase: new URL("https://aceleraautocrm.com.br"),
  alternates: {
    canonical: "https://aceleraautocrm.com.br",
  },
  title: {
    default: "Acelera Auto CRM | CRM Automotivo de Alta Velocidade",
    template: "%s | Acelera Auto CRM",
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
    title: "Acelera Auto CRM | CRM Automotivo de Alta Velocidade",
    description:
      "O CRM que acelera o fechamento de vendas de veículos. Funil Kanban integrado ao WhatsApp, gestão de pátio e métricas em tempo real.",
    url: "https://aceleraautocrm.com.br",
    siteName: "Acelera Auto CRM",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "https://aceleraautocrm.com.br/og-image.png",
        secureUrl: "https://aceleraautocrm.com.br/og-image.png",
        width: 1200,
        height: 630,
        type: "image/png",
        alt: "Acelera Auto CRM Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Acelera Auto CRM | CRM Automotivo de Alta Velocidade",
    description:
      "Acelere o fechamento de vendas de veículos e gerencie seus leads em tempo real.",
    images: ["https://aceleraautocrm.com.br/og-image.png"],
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
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://aceleraautocrm.com.br/#organization",
      name: "Catuto Soluções Digitais",
      legalName: "Catuto Soluções Digitais",
      url: "https://aceleraautocrm.com.br",
      logo: {
        "@type": "ImageObject",
        url: "https://aceleraautocrm.com.br/logo.png",
        width: 512,
        height: 512,
      },
      contactPoint: {
        "@type": "ContactPoint",
        email: "contato@aceleraautocrm.com.br",
        contactType: "customer service",
        availableLanguage: ["Portuguese"],
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://aceleraautocrm.com.br/#software",
      name: "Acelera Auto CRM",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web Browser",
      url: "https://aceleraautocrm.com.br",
      description:
        "CRM e Funil de Vendas projetado para lojas de veículos e concessionárias. Acelere o atendimento de leads do WhatsApp e controle seu estoque.",
      publisher: {
        "@id": "https://aceleraautocrm.com.br/#organization",
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