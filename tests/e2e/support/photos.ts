/**
 * Test photos for the analysis e2e tests, derived at test time from the public-domain NASA
 * portrait (tests/fixtures/SOURCES.md), so no extra images are committed. Encoded with jpeg-js
 * (dev-only, D-022).
 */
import { readFileSync } from "node:fs";
import jpeg from "jpeg-js";

export const FIXTURE = "tests/fixtures/faces/nasa-watkins-2017.jpg";

type Rgba = { width: number; height: number; data: Uint8Array };
export type TestPhoto = { name: string; mimeType: string; buffer: Buffer };

const JPEG_QUALITY = 92;

let original: Rgba | null = null;
function decodeFixture(): Rgba {
  original ??= (() => {
    const raw = jpeg.decode(readFileSync(FIXTURE), { useTArray: true, formatAsRGBA: true });
    return { width: raw.width, height: raw.height, data: raw.data };
  })();
  return original;
}

/** Encode pixels only (never an exifBuffer, so orientation is exactly what each helper sets). */
const encode = (img: Rgba) =>
  Buffer.from(
    jpeg.encode({ width: img.width, height: img.height, data: Buffer.from(img.data) }, JPEG_QUALITY)
      .data,
  );

const photo = (name: string, buffer: Buffer): TestPhoto => ({
  name,
  mimeType: "image/jpeg",
  buffer,
});

/** The portrait as it is: passes every check except FACE_TOO_SMALL (a waist-up portrait). */
export const portrait = (): TestPhoto => photo("portrait.jpg", readFileSync(FIXTURE));

/**
 * Cropped around the face, so the face fills enough of the frame: no quality warnings.
 * The crop box is in fractions of the original (the face is centred near x 0.5, y 0.3).
 */
export function closeUp(): TestPhoto {
  const src = decodeFixture();
  const x0 = Math.round(src.width * 0.2);
  const y0 = Math.round(src.height * 0.05);
  const w = Math.round(src.width * 0.6);
  const h = Math.round(src.height * 0.55);
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const from = ((y0 + y) * src.width + x0) * 4;
    data.set(src.data.subarray(from, from + w * 4), y * w * 4);
  }
  return photo("close-up.jpg", encode({ width: w, height: h, data }));
}

/** Every channel scaled down (an underexposed shot): TOO_DARK. */
export function darkened(factor = 0.3): TestPhoto {
  const src = decodeFixture();
  const data = new Uint8Array(src.data.length);
  for (let i = 0; i < data.length; i++) data[i] = i % 4 === 3 ? 255 : src.data[i]! * factor;
  return photo("dark.jpg", encode({ ...src, data }));
}

/** A plain wall-like gradient: NO_FACE. */
export function noFace(width = 800, height = 1000): TestPhoto {
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      const v = 200 - Math.round((y / height) * 60);
      data.set([v, v - 8, v - 18, 255], o);
    }
  }
  return photo("wall.jpg", encode({ width, height, data }));
}

/** The close-up re-encoded sideways (as exifRotated) but WITHOUT the EXIF tag: a control. */
export function sidewaysWithoutExif(): TestPhoto {
  const r = exifRotated();
  // Only pixels: jpeg-js would otherwise write the decoded exifBuffer back into the file.
  const { width, height, data } = jpeg.decode(r.buffer, { useTArray: true, formatAsRGBA: true });
  return photo("sideways.jpg", encode({ width, height, data }));
}

/**
 * The close-up stored rotated a quarter turn anticlockwise, with EXIF Orientation = 6 ("rotate
 * 90° clockwise to display"), like a phone held upright. Decoded upright only if the app
 * applies EXIF orientation (D-035).
 */
export function exifRotated(): TestPhoto {
  const upright = jpeg.decode(closeUp().buffer, { useTArray: true, formatAsRGBA: true });
  const { width: w, height: h } = upright;
  // Stored image is h × w: stored (x, y) shows upright pixel (w − 1 − y, x).
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < w; y++) {
    for (let x = 0; x < h; x++) {
      const from = (x * w + (w - 1 - y)) * 4;
      data.set(upright.data.subarray(from, from + 4), (y * h + x) * 4);
    }
  }
  return photo("rotated.jpg", withExifOrientation(encode({ width: h, height: w, data }), 6));
}

/** Insert a minimal EXIF APP1 segment (IFD0 with one Orientation tag) right after SOI. */
export function withExifOrientation(jpg: Buffer, orientation: number): Buffer {
  const tiff = Buffer.alloc(26);
  tiff.write("MM", 0, "ascii"); // big-endian
  tiff.writeUInt16BE(42, 2);
  tiff.writeUInt32BE(8, 4); // IFD0 offset
  tiff.writeUInt16BE(1, 8); // one entry
  tiff.writeUInt16BE(0x0112, 10); // Orientation
  tiff.writeUInt16BE(3, 12); // SHORT
  tiff.writeUInt32BE(1, 14); // count
  tiff.writeUInt16BE(orientation, 18); // value, left-justified in the 4-byte field
  tiff.writeUInt32BE(0, 22); // no next IFD
  const payload = Buffer.concat([Buffer.from("Exif\0\0", "binary"), tiff]);
  const header = Buffer.from([0xff, 0xe1, 0, 0]);
  header.writeUInt16BE(payload.length + 2, 2);
  return Buffer.concat([jpg.subarray(0, 2), header, payload, jpg.subarray(2)]);
}
