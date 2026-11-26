"use client";

import { useId, useState, type DragEvent } from "react";
import { UploadIcon } from "@/components/icons";
import { useT } from "@/i18n/useT";
import {
  checkPhotoFile,
  MAX_PHOTO_BYTES,
  PHOTO_ACCEPT_ATTRIBUTE,
  SNIFF_BYTES,
  type PhotoRejection,
} from "@/lib/image";
import { useFlowStore } from "@/store/flow";

const BYTES_PER_MB = 1024 * 1024;

/**
 * Photo upload (SPEC §3): a native file input (keyboard and screen-reader support, opens the
 * phone's photo picker) styled as a button, plus a drop zone. The file is checked by its first
 * bytes before anything is decoded (D-035). An accepted file goes to the flow store, in memory
 * only; nothing is uploaded. Errors are announced through a live region.
 */
export function PhotoPicker({ onPicked }: { onPicked?: () => void }) {
  const t = useT();
  const setPhoto = useFlowStore((s) => s.setPhoto);
  const [error, setError] = useState<PhotoRejection | null>(null);
  const [dragging, setDragging] = useState(false);
  const id = useId();
  const inputId = `${id}-input`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  async function take(file: File | undefined) {
    if (!file) return;
    let head: Uint8Array;
    try {
      head = new Uint8Array(await file.slice(0, SNIFF_BYTES).arrayBuffer());
    } catch {
      setError("unsupported");
      return;
    }
    const check = checkPhotoFile(file, head);
    if (!check.ok) {
      setError(check.reason);
      return;
    }
    setError(null);
    setPhoto(file);
    onPicked?.();
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    void take(e.dataTransfer.files[0]);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`relative border bg-surface p-6 sm:p-7 ${dragging ? "border-accent" : "border-line"} before:pointer-events-none before:absolute before:inset-2 before:border before:border-dashed before:border-line`}
    >
      <div className="relative flex flex-wrap items-center gap-x-5 gap-y-4">
        <input
          id={inputId}
          type="file"
          accept={PHOTO_ACCEPT_ATTRIBUTE}
          aria-describedby={error ? `${hintId} ${errorId}` : hintId}
          aria-invalid={error ? true : undefined}
          className="peer sr-only"
          onChange={(e) => {
            void take(e.target.files?.[0]);
            e.target.value = ""; // allow picking the same file again
          }}
        />
        <label
          htmlFor={inputId}
          className="inline-flex min-h-12 cursor-pointer items-center gap-2.5 bg-ink px-7 text-sm font-medium tracking-[0.14em] text-on-ink uppercase peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-focus"
        >
          <UploadIcon />
          {t("photo.choose")}
        </label>
        <span className="text-muted">{t("photo.drop")}</span>
      </div>
      <p id={hintId} className="relative mt-3.5 text-[0.8125rem] text-muted">
        {t("photo.hint")}
      </p>
      {/* Always in the DOM (empty when there's no error) so screen readers announce changes. */}
      <p
        id={errorId}
        role="alert"
        className="relative mt-3 border-l-2 border-accent pl-3 text-sm text-ink empty:mt-0 empty:border-0 empty:pl-0"
      >
        {error && t(`photo.errors.${error}`, { max: Math.round(MAX_PHOTO_BYTES / BYTES_PER_MB) })}
      </p>
    </div>
  );
}
