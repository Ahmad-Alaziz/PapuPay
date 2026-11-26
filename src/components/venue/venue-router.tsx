"use client";

import { lazy, Suspense } from "react";
import GuestApp from "@/guest/GuestApp";

const Staff = lazy(() => import("@/Staff"));

export default function VenueRouter() {
  const isStaff =
    /^(?:\/v\/[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?)?\/staff\/?$/.test(
      location.pathname,
    );
  return isStaff ? (
    <Suspense
      fallback={
        <div
          className="venue-entry-loading"
          role="status"
          aria-label="PapuPay"
        />
      }
    >
      <Staff />
    </Suspense>
  ) : (
    <GuestApp />
  );
}
