import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { defaultLocale, hasLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { papayaMarkSvg } from "@/lib/brand";

export const alt = "PapuPay: menus, reviews and regulars from one tap.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export default async function OpengraphImage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const dict = getDictionary(hasLocale(lang) ? lang : defaultLocale);
  const markSrc = `data:image/svg+xml;base64,${Buffer.from(papayaMarkSvg).toString("base64")}`;
  const outfit = await readFile(join(process.cwd(), "src/assets/fonts/Outfit-ExtraBold.ttf"));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#FFF5E7",
          padding: 56,
          gap: 40,
          fontFamily: "Outfit",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src={markSrc} width={72} height={72} alt="" />
            <span style={{ fontSize: 56, fontWeight: 800, color: "#173D2B", letterSpacing: -2 }}>papupay</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {dict.hero.title.map((line, index) => (
              <span
                key={line}
                style={{
                  fontSize: 84,
                  fontWeight: 800,
                  lineHeight: 1.02,
                  letterSpacing: -3,
                  color: index === 1 ? "#B4460E" : "#173D2B",
                }}
              >
                {line}
              </span>
            ))}
          </div>
          <span
            style={{
              display: "flex",
              alignSelf: "flex-start",
              background: "#173D2B",
              color: "#FFF5E7",
              fontSize: 26,
              padding: "8px 16px",
              borderRadius: 10,
            }}
          >
            {dict.mockup.tagline}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            width: 380,
            borderRadius: 48,
            background: "#FFE6CC",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              right: -40,
              bottom: -40,
              width: 180,
              height: 180,
              borderRadius: 999,
              background: "#173D2B",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: -60,
              top: -60,
              width: 240,
              height: 240,
              borderRadius: 999,
              background: "#D9EE9B",
            }}
          />
          <img src={markSrc} width={280} height={280} alt="" style={{ position: "relative" }} />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Outfit", data: outfit, weight: 800, style: "normal" }],
    },
  );
}
