import { ImageResponse } from "next/og";
import { site } from "@/content/site";

export const alt = `${site.name} — ${site.shortTitle}`;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "stretch",
          background: "#f4f1e8",
          color: "#171714",
          display: "flex",
          flexDirection: "column",
          fontFamily: "Arial, sans-serif",
          height: "100%",
          justifyContent: "space-between",
          padding: "72px 80px",
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "center",
            display: "flex",
            fontSize: 26,
            justifyContent: "space-between",
            letterSpacing: "-0.02em",
          }}
        >
          <span>{site.name}</span>
          <span style={{ color: "#68675f" }}>{site.location}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <div
            style={{
              display: "flex",
              fontSize: 76,
              fontWeight: 700,
              letterSpacing: "-0.055em",
              lineHeight: 1.02,
              maxWidth: 1020,
            }}
          >
            {site.shortTitle}
          </div>
          <div
            style={{
              color: "#4f4e48",
              display: "flex",
              fontSize: 31,
              lineHeight: 1.3,
              maxWidth: 960,
            }}
          >
            Building AI-native products from idea to production.
          </div>
        </div>

        <div
          style={{
            alignItems: "center",
            borderTop: "2px solid #d8d3c5",
            display: "flex",
            fontSize: 24,
            justifyContent: "space-between",
            paddingTop: 28,
          }}
        >
          <span>{site.url.replace("https://", "")}</span>
          <span style={{ color: "#246b4a" }}>● {site.status}</span>
        </div>
      </div>
    ),
    size,
  );
}
