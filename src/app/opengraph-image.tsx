import { ImageResponse } from "next/og";

export const alt = "Acelera Auto CRM - CRM Automotivo de Alta Velocidade";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#09090b",
          backgroundImage:
            "radial-gradient(circle at 50% 0%, rgba(249, 115, 22, 0.22) 0%, transparent 65%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
          padding: "48px 64px",
          boxSizing: "border-box",
        }}
      >
        {/* Top bar / branding */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #f97316 0%, #dc2626 100%)",
              fontSize: "32px",
              boxShadow: "0 8px 24px rgba(249, 115, 22, 0.4)",
            }}
          >
            ⚡
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: "40px",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "#ffffff",
            }}
          >
            <span>Acelera Auto&nbsp;</span>
            <span style={{ color: "#f97316" }}>CRM</span>
          </div>
        </div>

        {/* Title / Heading */}
        <div
          style={{
            fontSize: "48px",
            fontWeight: 800,
            textAlign: "center",
            lineHeight: 1.15,
            maxWidth: "950px",
            marginBottom: "20px",
            letterSpacing: "-0.02em",
            color: "#fafafa",
          }}
        >
          O CRM Automotivo de Alta Velocidade para Lojas e Concessionárias
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: "22px",
            color: "#a1a1aa",
            textAlign: "center",
            maxWidth: "800px",
            marginBottom: "40px",
            lineHeight: 1.4,
          }}
        >
          Acelere o atendimento de leads do WhatsApp, organize o pátio e aumente o giro do estoque.
        </div>

        {/* Feature Badges */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "rgba(249, 115, 22, 0.12)",
              border: "1px solid rgba(249, 115, 22, 0.35)",
              padding: "10px 20px",
              borderRadius: "9999px",
              fontSize: "18px",
              fontWeight: 600,
              color: "#fb923c",
            }}
          >
            ⚡ Gestão de Pátio
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "rgba(34, 197, 94, 0.12)",
              border: "1px solid rgba(34, 197, 94, 0.35)",
              padding: "10px 20px",
              borderRadius: "9999px",
              fontSize: "18px",
              fontWeight: 600,
              color: "#4ade80",
            }}
          >
            💬 Integração WhatsApp
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "rgba(168, 85, 247, 0.12)",
              border: "1px solid rgba(168, 85, 247, 0.35)",
              padding: "10px 20px",
              borderRadius: "9999px",
              fontSize: "18px",
              fontWeight: 600,
              color: "#c084fc",
            }}
          >
            📊 Métricas em Tempo Real
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
