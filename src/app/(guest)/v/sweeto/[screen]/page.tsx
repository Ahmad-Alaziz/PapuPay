import { notFound } from "next/navigation";
import { SweetoGuestPage, sweetoScreens } from "@/components/guest/sweeto";

export function generateStaticParams() {
  return sweetoScreens.map((screen) => ({ screen }));
}

export default async function SweetoScreenPage({ params }: PageProps<"/v/sweeto/[screen]">) {
  const { screen } = await params;
  const match = sweetoScreens.find((value) => value === screen);
  if (!match) notFound();

  return <SweetoGuestPage screen={match} />;
}
