"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";

// The verified client experience uses native dialogs, browser history, and
// storage. Retain an accessible, useful server-rendered shell while it loads.
const VenueRouter = dynamic(() => import("./venue-router"), { ssr: false });

export default function VenueEntry({ children }: { children: ReactNode }) {
  return (
    <div className="venue-entry">
      {children}
      <VenueRouter />
    </div>
  );
}
