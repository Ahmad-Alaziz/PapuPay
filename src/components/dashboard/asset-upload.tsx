"use client";

import { useId, useState, useTransition } from "react";
import { FileText, LoaderCircle, Upload } from "lucide-react";
import { confirmUpload, prepareUpload, removeUpload } from "@/merchant/actions/venue-settings";
import type { DashboardDictionary } from "@/merchant/i18n/en";
import type { MenuLanguage, UploadKind } from "@/merchant/venue-rules";
import { cn } from "@/lib/utils";

type Current = { url: string; contentType: string; byteSize: number } | null;
type ErrorCode = keyof DashboardDictionary["venue"]["upload"]["errors"];

async function imageSize(file: File) {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return {};
  }
}

/**
 * Uploads one file straight to Storage with a signed URL, then asks the server
 * to verify it and attach it to the venue's draft.
 */
export function AssetUpload({
  venueId,
  kind,
  language,
  current,
  accept,
  hint,
  labels,
  title,
  surface = "light",
}: {
  venueId: string;
  kind: UploadKind;
  language?: MenuLanguage;
  current: Current;
  accept: string;
  hint: string;
  labels: DashboardDictionary["venue"]["upload"];
  title: string;
  /** Background behind image thumbnails: "dark" for white logos. */
  surface?: "light" | "dark";
}) {
  const inputId = useId();
  const [error, setError] = useState<ErrorCode | null>(null);
  const [busy, setBusy] = useState(false);
  const [removing, startRemoving] = useTransition();

  async function upload(file: File) {
    setError(null);
    setBusy(true);
    try {
      const prepared = await prepareUpload({ venueId, kind, contentType: file.type, size: file.size });
      if (!prepared.ok) return setError(prepared.error);
      const sent = await fetch(prepared.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      }).catch(() => null);
      if (!sent?.ok) return setError("failed");
      const dimensions = file.type.startsWith("image/") ? await imageSize(file) : {};
      const confirmed = await confirmUpload({ venueId, kind, language, path: prepared.path, ...dimensions });
      if (!confirmed.ok) setError(confirmed.error);
    } catch {
      setError("failed");
    } finally {
      setBusy(false);
    }
  }

  const isPdf = current?.contentType === "application/pdf";

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-4">
        {current ? (
          isPdf ? (
            <a
              href={current.url}
              target="_blank"
              rel="noreferrer"
              className="flex h-20 items-center gap-3 rounded-2xl bg-muted/70 px-4 text-sm font-semibold underline-offset-4 hover:underline"
            >
              <FileText aria-hidden="true" className="size-7 text-papaya-ink" />
              <span>
                {labels.open} PDF
                <span className="block text-xs font-normal text-muted-foreground">
                  {(current.byteSize / 1024 / 1024).toFixed(1)} MB
                </span>
              </span>
            </a>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- user uploads from Storage, shown as-is
            <img
              src={current.url}
              alt={title}
              className={cn(
                "h-24 max-w-56 rounded-2xl border border-border object-contain p-2",
                surface === "dark" ? "bg-leaf" : "bg-[repeating-conic-gradient(#f3e4d0_0_25%,#fffbf5_0_50%)] bg-[length:16px_16px]",
              )}
            />
          )
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor={inputId}
            aria-disabled={busy}
            className={cn(
              "inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-leaf/25 px-4 text-sm font-semibold text-leaf transition-colors hover:border-leaf hover:bg-leaf/5",
              "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-leaf",
              busy && "pointer-events-none opacity-60",
            )}
          >
            {busy ? (
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <Upload aria-hidden="true" className="size-4" />
            )}
            {busy ? labels.uploading : current ? labels.replace : labels.choose}
            <span className="sr-only">: {title}</span>
            <input
              id={inputId}
              type="file"
              accept={accept}
              className="sr-only"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void upload(file);
              }}
            />
          </label>
          {current ? (
            <button
              type="button"
              disabled={busy || removing}
              onClick={() =>
                startRemoving(async () => {
                  const result = await removeUpload({ venueId, kind, language });
                  if (!result.ok) setError(result.error);
                })
              }
              className="h-10 rounded-full px-3 text-sm font-semibold text-destructive outline-none hover:bg-destructive/10 focus-visible:outline-3 focus-visible:outline-leaf disabled:opacity-50"
            >
              {labels.remove}
              <span className="sr-only">: {title}</span>
            </button>
          ) : null}
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{hint}</p>
      <p aria-live="polite" className="text-sm font-medium text-destructive empty:hidden">
        {error ? labels.errors[error] : ""}
      </p>
    </div>
  );
}
