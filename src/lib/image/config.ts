/**
 * Photo input limits (SPEC §3 Phase 1 photo input, D-035). Named, commented constants only.
 */

/** Formats every current browser decodes, which the analysis accepts. */
export const ACCEPTED_PHOTO_FORMATS = ["jpeg", "png", "webp"] as const;

/**
 * `accept` attribute for the file input: MIME types plus extensions (some pickers match only one
 * of the two). HEIC is deliberately absent: iOS converts Photo Library picks to JPEG anyway, and
 * only Safari can decode HEIC, so HEIC that still arrives (Files app, macOS, drag and drop) gets
 * a friendly message instead (D-035).
 */
export const PHOTO_ACCEPT_ATTRIBUTE = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

/**
 * Largest file we accept, in bytes. A 48 MP phone JPEG is usually 8–20 MB; 30 MB leaves room for
 * high-quality exports while refusing files that would stall decoding on a mid-range phone.
 * (M6b downscales to a fixed long side before analysis anyway.)
 */
export const MAX_PHOTO_BYTES = 30 * 1024 * 1024;

/** How many leading bytes the format sniffer reads (the longest signature we check is 12). */
export const SNIFF_BYTES = 16;

/**
 * ISO-BMFF major brands of HEIF/HEIC stills and sequences (ISO/IEC 23008-12). `mif1` and `msf1`
 * are the generic HEIF brands. AVIF (`avif`, `avis`) is not listed: it reads as unsupported.
 */
export const HEIF_BRANDS = [
  "heic",
  "heix",
  "hevc",
  "hevx",
  "heim",
  "heis",
  "hevm",
  "hevs",
  "mif1",
  "msf1",
] as const;

/** MIME types and extensions that say "HEIC/HEIF" even when the bytes can't be read. */
export const HEIF_MIME_TYPES = [
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
] as const;
export const HEIF_EXTENSIONS = [".heic", ".heif"] as const;

/**
 * Long side, in pixels, that a photo is downscaled to before analysis (D-035). At 1600 px a face
 * that fills a third of a selfie's width is ~400 px wide, so each cheek region keeps thousands of
 * pixels (MIN_VALID_PIXELS is 300), while a 48 MP photo shrinks ~20× and can't stall a mid-range
 * phone. Smaller photos are never enlarged.
 */
export const ANALYSIS_MAX_LONG_SIDE_PX = 1600;
