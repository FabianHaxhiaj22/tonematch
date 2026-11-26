import { describe, expect, it } from "vitest";
import { checkPhotoFile, looksLikeHeif, MAX_PHOTO_BYTES, sniffImageFormat } from "@/lib/image";

/** Build a byte array from numbers and ASCII strings. */
const bytes = (...parts: (number[] | string)[]) =>
  new Uint8Array(
    parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)),
  );

const JPEG = bytes([0xff, 0xd8, 0xff, 0xe0, 0, 0x10], "JFIF");
const PNG = bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]);
const WEBP = bytes("RIFF", [0x24, 0, 0, 0], "WEBPVP8 ");
const heif = (brand: string) => bytes([0, 0, 0, 0x18], "ftyp", brand, [0, 0, 0, 0]);
const AVIF = heif("avif");
const GIF = bytes("GIF89a", [1, 0, 1, 0, 0, 0]);

describe("sniffImageFormat", () => {
  it.each([
    ["jpeg", JPEG],
    ["png", PNG],
    ["webp", WEBP],
    ["heif", heif("heic")],
    ["heif", heif("heix")],
    ["heif", heif("mif1")],
    ["unknown", AVIF],
    ["unknown", GIF],
    ["unknown", new Uint8Array()],
    ["unknown", bytes([0xff, 0xd8])], // truncated JPEG signature
    ["unknown", bytes("RIFF", [0, 0, 0, 0], "WAVE")], // RIFF, but audio
    ["unknown", bytes([0, 0, 0, 0], "ftypisom", [0, 0, 0, 0])], // MP4, not HEIF
  ])("%s", (expected, head) => {
    expect(sniffImageFormat(head)).toBe(expected);
  });
});

describe("looksLikeHeif", () => {
  it.each([
    [{ name: "IMG_0001.HEIC", type: "" }, true],
    [{ name: "photo.heif", type: "application/octet-stream" }, true],
    [{ name: "photo", type: "image/heic" }, true],
    [{ name: "photo", type: "IMAGE/HEIF-SEQUENCE" }, true],
    [{ name: "photo.jpg", type: "image/jpeg" }, false],
    [{ name: "heic.jpg", type: "" }, false],
  ])("%j → %s", (meta, expected) => {
    expect(looksLikeHeif(meta)).toBe(expected);
  });
});

describe("checkPhotoFile", () => {
  const meta = (over: Partial<{ name: string; type: string; size: number }> = {}) => ({
    name: "selfie.jpg",
    type: "image/jpeg",
    size: 2_000_000,
    ...over,
  });

  it("accepts JPEG, PNG and WebP by their bytes", () => {
    expect(checkPhotoFile(meta(), JPEG)).toEqual({ ok: true, format: "jpeg" });
    expect(checkPhotoFile(meta({ name: "a.png", type: "image/png" }), PNG)).toEqual({
      ok: true,
      format: "png",
    });
    expect(checkPhotoFile(meta({ name: "a.webp", type: "image/webp" }), WEBP)).toEqual({
      ok: true,
      format: "webp",
    });
  });

  it("trusts the bytes over a wrong or missing MIME type", () => {
    expect(checkPhotoFile(meta({ name: "x", type: "" }), JPEG)).toEqual({
      ok: true,
      format: "jpeg",
    });
    expect(checkPhotoFile(meta(), heif("heic"))).toEqual({ ok: false, reason: "heic" });
  });

  it("recognises HEIC by name or MIME type when the bytes are not recognised", () => {
    expect(checkPhotoFile(meta({ name: "IMG_1.HEIC", type: "" }), new Uint8Array())).toEqual({
      ok: false,
      reason: "heic",
    });
  });

  it("rejects other formats as unsupported", () => {
    expect(checkPhotoFile(meta({ name: "a.gif", type: "image/gif" }), GIF)).toEqual({
      ok: false,
      reason: "unsupported",
    });
    expect(checkPhotoFile(meta({ name: "a.avif", type: "image/avif" }), AVIF)).toEqual({
      ok: false,
      reason: "unsupported",
    });
  });

  it("rejects empty files and files over the size limit", () => {
    expect(checkPhotoFile(meta({ size: 0 }), JPEG)).toEqual({ ok: false, reason: "empty" });
    expect(checkPhotoFile(meta({ size: MAX_PHOTO_BYTES }), JPEG).ok).toBe(true);
    expect(checkPhotoFile(meta({ size: MAX_PHOTO_BYTES + 1 }), JPEG)).toEqual({
      ok: false,
      reason: "tooLarge",
    });
  });
});
