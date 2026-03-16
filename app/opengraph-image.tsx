import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "FIEL.IA - A Inteligência Artificial do Torcedor Fiel";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 50%, #0A0A0A 100%)",
          position: "relative",
        }}
      >
        {/* Orange glow */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "600px",
            height: "600px",
            background: "radial-gradient(ellipse at center, rgba(232,101,10,0.15) 0%, transparent 70%)",
          }}
        />

        {/* Top bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: "linear-gradient(90deg, transparent, #E8650A, transparent)",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontSize: "120px",
              fontWeight: 900,
              color: "white",
              letterSpacing: "-2px",
              lineHeight: 1,
            }}
          >
            FIEL IA
            <span style={{ color: "#E8650A", marginLeft: "8px" }}>●</span>
          </div>

          <div
            style={{
              fontSize: "28px",
              color: "rgba(255,255,255,0.7)",
              marginTop: "16px",
              letterSpacing: "0.15em",
              textTransform: "uppercase" as const,
            }}
          >
            A Inteligência Artificial do Torcedor Fiel
          </div>

          <div
            style={{
              display: "flex",
              gap: "24px",
              marginTop: "40px",
            }}
          >
            {["Chat IA 24/7", "Quiz com Prêmios", "Notícias Verificadas"].map(
              (item) => (
                <div
                  key={item}
                  style={{
                    background: "rgba(232,101,10,0.15)",
                    border: "1px solid rgba(232,101,10,0.3)",
                    borderRadius: "9999px",
                    padding: "8px 24px",
                    fontSize: "18px",
                    color: "#E8650A",
                  }}
                >
                  {item}
                </div>
              )
            )}
          </div>
        </div>

        {/* Bottom text */}
        <div
          style={{
            position: "absolute",
            bottom: "30px",
            fontSize: "16px",
            color: "rgba(255,255,255,0.3)",
          }}
        >
          fielchat.com
        </div>
      </div>
    ),
    { ...size }
  );
}
