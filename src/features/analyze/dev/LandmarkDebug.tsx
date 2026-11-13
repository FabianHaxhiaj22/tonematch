"use client";

/**
 * Dev-only debug view (route /dev/landmarks; never in production builds).
 * M2: upload a photo → landmarks from the worker. M3: skin regions, filtered pixels, region
 * medians, cheek disagreement, quality issues, and white-paper calibration (tap to calibrate).
 * English-only on purpose: never shipped to users. Nothing is stored or sent anywhere; the
 * pixels stay in this tab and are dropped on the next photo or when the page closes.
 */
import { FaceLandmarker } from "@mediapipe/tasks-vision";
import { useEffect, useRef, useState } from "react";
import type { Lab } from "@/lib/color";
import { SKIN_REGION_INDICES, WB_PATCH_RADIUS, type RegionName } from "@/lib/analysis/config";
import type { RgbaImage } from "@/lib/analysis/image";
import { toMat4, translationOf } from "@/lib/analysis/matrix";
import { assessQuality, type QualityResult } from "@/lib/analysis/quality";
import { REGION_NAMES, type Point, type Polygon } from "@/lib/analysis/regions";
import { sampleSkin, type SkinSample } from "@/lib/analysis/sampler";
import { measureWhitePatch, type PatchResult } from "@/lib/analysis/whiteBalance";
import type { DetectResponse } from "@/workers/landmarker.protocol";
import { LandmarkerClient } from "../landmarkerClient";

const MAX_CANVAS_WIDTH = 800;

const REGION_RGB: Record<RegionName, [number, number, number]> = {
  forehead: [255, 196, 0],
  leftCheek: [255, 64, 160],
  rightCheek: [64, 160, 255],
};
const rgba = ([r, g, b]: [number, number, number], a: number) => `rgba(${r}, ${g}, ${b}, ${a})`;

type Status = "idle" | "running" | "done" | "error";

/** Everything kept for the current photo (in memory only). */
type Session = {
  bitmap: ImageBitmap;
  image: RgbaImage;
  res: DetectResponse;
  landmarksPx: Point[] | null;
  quality: QualityResult;
  sample: SkinSample | null;
};

type Calibration = { x: number; y: number; patch: PatchResult; sample: SkinSample | null };

export function LandmarkDebug() {
  const clientRef = useRef<LandmarkerClient | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [output, setOutput] = useState("");
  const [showIndices, setShowIndices] = useState(true);
  const [calibrating, setCalibrating] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [calibration, setCalibration] = useState<Calibration | null>(null);

  useEffect(() => {
    clientRef.current = new LandmarkerClient();
    return () => {
      clientRef.current?.dispose();
      sessionRef.current?.bitmap.close();
    };
  }, []);

  // Redraw when the photo, the calibration patch or the label toggle changes.
  useEffect(() => {
    if (session) draw(canvasRef.current, session, calibration, showIndices);
  }, [session, calibration, showIndices]);

  async function analyse(source: ImageBitmapSource) {
    const client = clientRef.current;
    if (!client) return;
    setStatus("running");
    setOutput("");
    setCalibration(null);
    setCalibrating(false);
    sessionRef.current?.bitmap.close();
    sessionRef.current = null;
    setSession(null);
    try {
      // Two bitmaps: one is transferred to (and closed by) the worker, one stays here.
      const opts: ImageBitmapOptions = { imageOrientation: "from-image" };
      const bitmap = await createImageBitmap(source, opts);
      const forWorker = await createImageBitmap(source, opts);
      const res = await client.detect(forWorker);
      const image = readPixels(bitmap);
      const faces = res.faces.map((f) => ({
        landmarksPx: f.landmarks.map((p) => ({ x: p.x * image.width, y: p.y * image.height })),
        matrix: f.matrix,
      }));
      const quality = assessQuality(image, faces);
      const landmarksPx = faces.length === 1 ? faces[0]!.landmarksPx : null;
      const sample = landmarksPx ? sampleSkin(image, landmarksPx) : null;
      const next: Session = { bitmap, image, res, landmarksPx, quality, sample };
      sessionRef.current = next;
      setSession(next);
      setOutput(describe(res));
      setStatus("done");
    } catch (err) {
      setOutput(err instanceof Error ? `${err.name}: ${err.message}` : String(err));
      setStatus("error");
    }
  }

  async function runSynthetic() {
    const canvas = new OffscreenCanvas(256, 256);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#c69c82";
    ctx.fillRect(0, 0, 256, 256);
    await analyse(canvas);
  }

  function onCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const s = sessionRef.current;
    const canvas = canvasRef.current;
    if (!calibrating || !s || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * s.image.width;
    const y = ((e.clientY - rect.top) / rect.height) * s.image.height;
    const patch = measureWhitePatch(s.image, x, y);
    const sample =
      patch.ok && s.landmarksPx ? sampleSkin(s.image, s.landmarksPx, { gains: patch.gains }) : null;
    setCalibration({ x, y, patch, sample });
    setCalibrating(false);
  }

  return (
    <main className="mx-auto w-full max-w-4xl p-6">
      <h1 className="text-2xl font-semibold">Landmarks (dev)</h1>
      <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
        Dev-only. The photo stays in this tab. Regions use the cited mesh indices in
        src/lib/analysis/config.ts; tinted pixels are the ones kept after filtering.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <label className="text-sm">
          Photo{" "}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void analyse(file);
            }}
          />
        </label>
        <button type="button" className="rounded border px-3 py-1 text-sm" onClick={runSynthetic}>
          Run synthetic image
        </button>
        <label className="text-sm">
          <input
            type="checkbox"
            checked={showIndices}
            onChange={(e) => setShowIndices(e.target.checked)}
          />{" "}
          Show region indices
        </label>
        <button
          type="button"
          className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          disabled={!session?.landmarksPx}
          aria-pressed={calibrating}
          onClick={() => setCalibrating((c) => !c)}
        >
          {calibrating ? "Click the white paper…" : "Calibrate: tap white paper"}
        </button>
        <button
          type="button"
          className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          disabled={!calibration}
          onClick={() => setCalibration(null)}
        >
          Clear calibration
        </button>
        <button
          type="button"
          className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          disabled={!session}
          onClick={() => session && downloadLandmarks(session.res)}
        >
          Download landmarks (JSON)
        </button>
      </div>
      <p data-testid="status" className="mt-3 text-sm" aria-live="polite">
        Status: {status}
      </p>
      {/* Click-to-calibrate is a dev-only mouse shortcut; the real calibration flow is M7. */}
      <canvas
        ref={canvasRef}
        onClick={onCanvasClick}
        className={`mt-3 max-w-full ${calibrating ? "cursor-crosshair" : ""}`}
        aria-label="Photo with landmarks, skin regions and kept pixels"
      />
      {session && <AnalysisPanel session={session} calibration={calibration} />}
      <pre data-testid="output" className="mt-3 text-xs whitespace-pre-wrap">
        {output}
      </pre>
    </main>
  );
}

function AnalysisPanel({
  session,
  calibration,
}: {
  session: Session;
  calibration: Calibration | null;
}) {
  const { quality, sample } = session;
  return (
    <section className="mt-4 space-y-4 text-sm" aria-label="Analysis details">
      <div>
        <h2 className="font-semibold">Quality gate</h2>
        {quality.issues.length === 0 ? (
          <p data-testid="quality-ok">No issues.</p>
        ) : (
          <ul data-testid="quality-issues" className="list-disc pl-5">
            {quality.issues.map((i) => (
              <li key={i.code}>
                {i.code} ({i.severity})
                {i.value !== undefined && ` — measured ${fmt(i.value)}, limit ${fmt(i.limit!)}`}
              </li>
            ))}
          </ul>
        )}
        {quality.metrics && (
          <pre className="mt-1 text-xs">{JSON.stringify(quality.metrics, roundJson, 1)}</pre>
        )}
      </div>
      {sample && (
        <div>
          <h2 className="font-semibold">Skin sample{sample.calibrated ? " (calibrated)" : ""}</h2>
          <SampleTable sample={sample} />
        </div>
      )}
      {calibration && (
        <div>
          <h2 className="font-semibold">White-paper calibration</h2>
          {calibration.patch.ok ? (
            <>
              <p>
                Patch at ({calibration.x.toFixed(0)}, {calibration.y.toFixed(0)}),{" "}
                {calibration.patch.pixels} px. Gains r {fmt(calibration.patch.gains.r)}, g{" "}
                {fmt(calibration.patch.gains.g)}, b {fmt(calibration.patch.gains.b)}.
              </p>
              {calibration.sample && <SampleTable sample={calibration.sample} />}
            </>
          ) : (
            <p>Patch rejected: {calibration.patch.reason}. Tap a plain, well-lit white area.</p>
          )}
        </div>
      )}
    </section>
  );
}

function SampleTable({ sample }: { sample: SkinSample }) {
  return (
    <>
      <table className="mt-1 text-xs">
        <thead>
          <tr className="text-left">
            <th className="pr-3">Region</th>
            <th className="pr-3">Pixels in region</th>
            <th className="pr-3">Kept</th>
            <th className="pr-3">Enough</th>
            <th>Median L*, a*, b*</th>
          </tr>
        </thead>
        <tbody>
          {REGION_NAMES.map((n) => {
            const r = sample.regions[n];
            return (
              <tr key={n}>
                <td className="pr-3">{n}</td>
                <td className="pr-3">{r.totalPixels}</td>
                <td className="pr-3">{r.validPixels}</td>
                <td className="pr-3">{r.enough ? "yes" : "NO"}</td>
                <td>{fmtLab(r.median)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-1 text-xs">
        Overall (weighted median): {fmtLab(sample.overall)} · Cheek ΔE:{" "}
        {sample.cheekDeltaE === null ? "n/a" : fmt(sample.cheekDeltaE)}
        {sample.cheekDifference &&
          ` (lightness ${fmt(sample.cheekDifference.lightness)}, colour ${fmt(sample.cheekDifference.chromatic)})`}
        {sample.unevenLighting && " · uneven lighting"}
        {sample.lowPixelRegions.length > 0 &&
          ` · too few pixels: ${sample.lowPixelRegions.join(", ")}`}
      </p>
    </>
  );
}

const fmt = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2));
const fmtLab = (c: Lab | null) => (c ? `${fmt(c.L)}, ${fmt(c.a)}, ${fmt(c.b)}` : "n/a");
const roundJson = (_k: string, v: unknown) =>
  typeof v === "number" ? Math.round(v * 1000) / 1000 : v;

/** Decode the bitmap's pixels at full resolution (stays in this tab). */
function readPixels(bitmap: ImageBitmap): RgbaImage {
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("2D canvas not available");
  ctx.drawImage(bitmap, 0, 0);
  return ctx.getImageData(0, 0, bitmap.width, bitmap.height);
}

function draw(
  canvas: HTMLCanvasElement | null,
  s: Session,
  calibration: Calibration | null,
  showIndices: boolean,
) {
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) return;
  const scale = Math.min(1, MAX_CANVAS_WIDTH / s.bitmap.width);
  canvas.width = Math.round(s.bitmap.width * scale);
  canvas.height = Math.round(s.bitmap.height * scale);
  ctx.drawImage(s.bitmap, 0, 0, canvas.width, canvas.height);
  const toCanvas = (p: Point): Point => ({ x: p.x * scale, y: p.y * scale });

  for (const face of s.res.faces) {
    const px: Point[] = face.landmarks.map((p) => ({
      x: p.x * canvas.width,
      y: p.y * canvas.height,
    }));
    ctx.fillStyle = "rgba(0, 255, 170, 0.6)";
    for (const p of px) ctx.fillRect(p.x - 0.5, p.y - 0.5, 1, 1);
    for (const set of [
      FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
      FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
      FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
      FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
      FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
      FaceLandmarker.FACE_LANDMARKS_LIPS,
    ]) {
      strokeConnections(ctx, px, set, "rgba(255,255,255,0.6)");
    }
    if (showIndices) {
      for (const name of REGION_NAMES) labelIndices(ctx, px, SKIN_REGION_INDICES[name]);
    }
  }

  if (s.sample) {
    // Kept pixels, tinted at full resolution, then scaled onto the canvas.
    const overlay = new OffscreenCanvas(s.image.width, s.image.height);
    const octx = overlay.getContext("2d");
    if (octx) {
      const tint = octx.createImageData(s.image.width, s.image.height);
      for (const name of REGION_NAMES) {
        const [r, g, b] = REGION_RGB[name];
        for (const i of s.sample.regions[name].validIndices) tint.data.set([r, g, b, 110], i * 4);
      }
      octx.putImageData(tint, 0, 0);
      ctx.drawImage(overlay, 0, 0, canvas.width, canvas.height);
    }
    for (const name of REGION_NAMES) {
      strokePolygon(ctx, s.sample.geometry.regions[name].map(toCanvas), rgba(REGION_RGB[name], 1));
    }
  }

  if (calibration) {
    const c = toCanvas({ x: calibration.x, y: calibration.y });
    const half = Math.max(3, WB_PATCH_RADIUS * scale);
    ctx.strokeStyle = calibration.patch.ok ? "#00e676" : "#ff1744";
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x - half, c.y - half, 2 * half, 2 * half);
    ctx.lineWidth = 1;
  }
}

function describe(res: DetectResponse): string {
  const lines = [
    `faces: ${res.faces.length}`,
    `image: ${res.imageWidth}×${res.imageHeight}`,
    `init: ${res.initMs.toFixed(0)} ms, detect: ${res.detectMs.toFixed(0)} ms`,
  ];
  res.faces.forEach((f, i) => {
    lines.push(`face ${i}: ${f.landmarks.length} landmarks`);
    if (f.matrix) {
      const m = toMat4(f.matrix);
      const t = translationOf(m);
      lines.push("  transformation matrix (row-major view of column-major data):");
      for (const row of m) lines.push(`    ${row.map((v) => v.toFixed(4).padStart(9)).join(" ")}`);
      lines.push(
        `  translation (cm): x ${t.x.toFixed(1)}, y ${t.y.toFixed(1)}, z ${t.z.toFixed(1)}`,
      );
    }
  });
  return lines.join("\n");
}

function strokePolygon(ctx: CanvasRenderingContext2D, poly: Polygon, color: string) {
  if (poly.length < 2) return;
  ctx.beginPath();
  poly.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.lineWidth = 1;
}

function strokeConnections(
  ctx: CanvasRenderingContext2D,
  px: Point[],
  connections: readonly { start: number; end: number }[],
  color: string,
) {
  ctx.beginPath();
  for (const { start, end } of connections) {
    const a = px[start];
    const b = px[end];
    if (!a || !b) continue;
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  ctx.strokeStyle = color;
  ctx.stroke();
}

function labelIndices(ctx: CanvasRenderingContext2D, px: Point[], indices: readonly number[]) {
  ctx.font = "bold 11px sans-serif";
  ctx.lineWidth = 3;
  for (const i of indices) {
    const p = px[i];
    if (!p) continue;
    ctx.fillStyle = "#000";
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    ctx.strokeStyle = "#fff";
    ctx.strokeText(String(i), p.x + 3, p.y - 3);
    ctx.fillText(String(i), p.x + 3, p.y - 3);
  }
  ctx.lineWidth = 1;
}

/**
 * Save landmarks + matrix as JSON (numbers only, no pixels), e.g. to build a test fixture.
 * The file is created in the browser and never leaves the device unless the user moves it.
 */
function downloadLandmarks(res: DetectResponse) {
  const data = { imageWidth: res.imageWidth, imageHeight: res.imageHeight, faces: res.faces };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "landmarks.json";
  a.click();
  URL.revokeObjectURL(url);
}
