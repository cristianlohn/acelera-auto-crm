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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://acelera-auto-crm.app"),
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
  authors: [{ name: "Acelera Auto" }],
  creator: "Acelera Auto",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName: "Acelera Auto CRM",
    title: "Acelera Auto CRM | CRM Automotivo de Alta Velocidade",
    description:
      "O CRM que acelera o fechamento de vendas de veículos. Funil Kanban integrado ao WhatsApp, gestão de pátio e métricas em tempo real.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Acelera Auto CRM - Visual Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Acelera Auto CRM | CRM Automotivo de Alta Velocidade",
    description: "Aumente o giro do seu pátio e não perca mais leads do WhatsApp.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}