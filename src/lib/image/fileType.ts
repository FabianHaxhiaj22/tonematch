import {
  ACCEPTED_PHOTO_FORMATS,
  HEIF_BRANDS,
  HEIF_EXTENSIONS,
  HEIF_MIME_TYPES,
  MAX_PHOTO_BYTES,
} from "./config";

/**
 * Photo file checks before anything is decoded (D-035). Pure: the caller reads the first
 * SNIFF_BYTES of the file and passes them in. The bytes decide the format, not the MIME type or
 * the name: browsers sometimes report HEIC as "" or "application/octet-stream", and a converted
 * file can keep a misleading name.
 */

export type SniffedFormat = "jpeg" | "png" | "webp" | "heif" | "unknown";
export type AcceptedFormat = (typeof ACCEPTED_PHOTO_FORMATS)[number];

export type PhotoMeta = { name: string; type: string; size: number };
export type PhotoRejection = "empty" | "heic" | "unsupported" | "tooLarge";
export type PhotoCheck =
  { ok: true; format: AcceptedFormat } | { ok: false; reason: PhotoRejection };

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const ascii = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.subarray(start, start + length));

/** Identify a still-image format from its leading bytes (magic numbers). */
export function sniffImageFormat(head: Uint8Array): SniffedFormat {
  if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "jpeg";
  if (head.length >= 8 && PNG_SIGNATURE.every((b, i) => head[i] === b)) return "png";
  if (head.length >= 12 && ascii(head, 0, 4) === "RIFF" && ascii(head, 8, 4) === "WEBP") {
    return "webp";
  }
  // ISO-BMFF: [box size: 4 bytes]["ftyp"][major brand: 4 bytes]
  if (head.length >= 12 && ascii(head, 4, 4) === "ftyp") {
    if ((HEIF_BRANDS as readonly string[]).includes(ascii(head, 8, 4))) return "heif";
  }
  return "unknown";
}

/** True when the name or MIME type says HEIC/HEIF (used when the bytes are not recognised). */
export function looksLikeHeif({ name, type }: Pick<PhotoMeta, "name" | "type">): boolean {
  const lower = name.toLowerCase();
  return (
    (HEIF_MIME_TYPES as readonly string[]).includes(type.toLowerCase()) ||
    HEIF_EXTENSIONS.some((ext) => lower.endsWith(ext))
  );
}

/** Decide whether a picked or dropped file can be analysed, and if not, why. */
export function checkPhotoFile(meta: PhotoMeta, head: Uint8Array): PhotoCheck {
  if (meta.size === 0) return { ok: false, reason: "empty" };
  const format = sniffImageFormat(head);
  if (format === "heif") return { ok: false, reason: "heic" };
  if ((ACCEPTED_PHOTO_FORMATS as readonly string[]).includes(format)) {
    if (meta.size > MAX_PHOTO_BYTES) return { ok: false, reason: "tooLarge" };
    return { ok: true, format: format as AcceptedFormat };
  }
  return { ok: false, reason: looksLikeHeif(meta) ? "heic" : "unsupported" };
}
