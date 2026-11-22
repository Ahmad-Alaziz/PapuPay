import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  other: {
    "apple-itunes-app": "app-id=6826778125, app-clip-bundle-id=com.papupay.app.Clip, app-clip-display=card",
  },
};

export default function SweetoLayout({ children }: { children: ReactNode }) {
  return children;
}
