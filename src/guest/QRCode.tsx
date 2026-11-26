import { useMemo } from "react";
import { create } from "qrcode";
import "./qr-code.css";

export default function QRCode({
  value,
  label,
  reveal = false,
}: {
  value: string;
  label: string;
  reveal?: boolean;
}) {
  const { path, size } = useMemo(() => {
    const { modules } = create(value, { errorCorrectionLevel: "M" });
    const padding = 4;
    let path = "";
    for (let row = 0; row < modules.size; row += 1) {
      for (let column = 0; column < modules.size; column += 1) {
        if (modules.get(row, column)) {
          path += `M${column + padding} ${row + padding}h1v1h-1z`;
        }
      }
    }
    return { path, size: modules.size + padding * 2 };
  }, [value]);

  const code = (
    <svg
      role="img"
      aria-label={label}
      className="papu-qr"
      width={192}
      height={192}
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
    >
      <rect width={size} height={size} fill="#fff" />
      <path d={path} fill="#102e24" />
    </svg>
  );

  if (!reveal) return code;

  return (
    <div className="papu-qr-reveal">
      {code}
      <span className="papu-qr-corners" aria-hidden="true" />
      <span className="papu-qr-sweep" aria-hidden="true" />
    </div>
  );
}
