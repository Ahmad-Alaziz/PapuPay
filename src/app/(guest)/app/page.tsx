import type { Metadata } from "next";
import { SweetoGuestPage } from "@/components/guest/sweeto";

export const metadata: Metadata = {
  itunes: { appId: "6826778125", appArgument: "https://papupay.com/app" },
};

export default function FullAppPage() {
  return <SweetoGuestPage screen="home" />;
}
