"use client";

/**
 * Dev-only debug view for M2 (route /dev/landmarks; never in production builds).
 * Upload a photo → landmarks from the worker → draw points, face oval and PLACEHOLDER regions.
 * English-only on purpose: never shipped to users. Nothing is stored or sent anywhere.
 */
import { FaceLandmarker } from "@mediapipe/tasks-vision";
import { useEffect, useRef, useState } from "react";
import { toMat4, translationOf } from "@/lib/analysis/matrix";
import {
  buildPlaceholderRegions,
  indicesOf,
  type FeatureIndexSets,
  type Point,
  type Polygon,
} from "@/lib/analysis/placeholderRegions";
import type { DetectResponse } from "@/workers/landmarker.protocol";
import { LandmarkerClient } from "../landmarkerClient";

const MAX_CANVAS_WIDTH = 800;

// Index sets exported by MediaPipe itself (no guessed indices).
const SETS: FeatureIndexSets = {
  faceOval: indicesOf(FaceLandmarker.FACE_LANDMARKS_FACE_OVAL),
  leftEye: indicesOf(FaceLandmarker.FACE_LANDMARKS_LEFT_EYE),
  rightEye: indicesOf(FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE),
  lips: indicesOf(FaceLandmarker.FACE_LANDMARKS_LIPS),
};

type Status = "idle" | "running" | "done" | "error";

export function LandmarkDebug() {
  const clientRef = useRef<LandmarkerClient | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [output, setOutput] = useState("");

  useEffect(() => {
    clientRef.current = new LandmarkerClient();
    return () => clientRef.current?.dispose();
  }, []);

  async function analyse(source: ImageBitmapSource) {
    const client = clientRef.current;
    if (!client) return;
    setStatus("running");
    setOutput("");
    try {
      // Two bitmaps: one is transferred to (and closed by) the worker, one is drawn here.
      const opts: ImageBitmapOptions = { imageOrientation: "from-image" };
      const forDrawing = await createImageBitmap(source, opts);
      const forWorker = await createImageBitmap(source, opts);
      const res = await client.detect(forWorker);
      draw(forDrawing, res);
      forDrawing.close();
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

  function draw(bitmap: ImageBitmap, res: DetectResponse) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const scale = Math.min(1, MAX_CANVAS_WIDTH / bitmap.width);
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    for (const face of res.faces) {
      const px: Point[] = face.landmarks.map((p) => ({
        x: p.x * canvas.width,
        y: p.y * canvas.height,
      }));
      ctx.fillStyle = "rgba(0, 255, 170, 0.9)";
      for (const p of px) ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
      strokeConnections(ctx, px, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, "rgba(255,255,255,0.8)");
      const regions = buildPlaceholderRegions(px, SETS);
      fillPolygon(ctx, regions.forehead, "rgba(255, 196, 0, 0.35)");
      fillPolygon(ctx, regions.leftCheek, "rgba(255, 64, 160, 0.35)");
      fillPolygon(ctx, regions.rightCheek, "rgba(64, 160, 255, 0.35)");
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl p-6">
      <h1 className="text-2xl font-semibold">Landmarks (dev)</h1>
      <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
        Dev-only. The photo stays in this tab. Regions are placeholders until M3.
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
      </div>
      <p data-testid="status" className="mt-3 text-sm" aria-live="polite">
        Status: {status}
      </p>
      <canvas
        ref={canvasRef}
        className="mt-3 max-w-full"
        aria-label="Photo with landmarks and placeholder regions"
      />
      <pre data-testid="output" className="mt-3 text-xs whitespace-pre-wrap">
        {output}
      </pre>
    </main>
  );
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

function polygonPath(ctx: CanvasRenderingContext2D, poly: Polygon) {
  ctx.beginPath();
  poly.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
}

function fillPolygon(ctx: CanvasRenderingContext2D, poly: Polygon, color: string) {
  polygonPath(ctx, poly);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = color.replace(/[\d.]+\)$/, "1)");
  ctx.stroke();
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
