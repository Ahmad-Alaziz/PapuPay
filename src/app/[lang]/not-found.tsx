import Image from "next/image";
import Link from "next/link";
import { lang } from "next/root-params";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/section";
import { defaultLocale, hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import papaya from "@/assets/papaya-illustration.png";

export default async function NotFound() {
  const current = await lang();
  const locale = hasLocale(current) ? current : defaultLocale;
  const { notFound } = getDictionary(locale);

  return (
    <Container className="flex flex-col items-center py-24 text-center sm:py-32">
      <Image src={papaya} alt="" className="h-auto w-36 -rotate-12" sizes="9rem" />
      <p className="mt-8 font-heading text-7xl font-extrabold text-papaya-ink">404</p>
      <h1 className="mt-4 max-w-lg text-3xl font-bold sm:text-4xl">{notFound.title}</h1>
      <p className="mt-3 text-lg text-muted-foreground">{notFound.body}</p>
      <Button asChild size="xl" className="mt-10">
        <Link href={`/${locale}`}>
          <ArrowLeft data-icon="inline-start" aria-hidden="true" />
          {notFound.cta}
        </Link>
      </Button>
    </Container>
  );
}
