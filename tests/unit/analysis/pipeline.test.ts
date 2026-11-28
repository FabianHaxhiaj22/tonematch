import { describe, expect, it } from "vitest";
import { analysePhoto, type DetectedFace } from "@/lib/analysis/pipeline";
import { assessQuality } from "@/lib/analysis/quality";
import { sampleSkin } from "@/lib/analysis/sampler";
import { scorePhoto, summarizePhoto } from "@/lib/analysis/score";
import { loadFixtureImage, loadFixtureLandmarks, solidImage, toPixels } from "./helpers";

const fixtureFace = (): DetectedFace => loadFixtureLandmarks().faces[0]!;

describe("analysePhoto (worker pipeline, M6b)", () => {
  it("analyses the real fixture: one warning (small face) and a numbers-only summary", () => {
    const img = loadFixtureImage();
    const r = analysePhoto(img, [fixtureFace()]);
    expect(r.kind).toBe("analysed");
    if (r.kind !== "analysed") return;
    expect(r.warnings.map((w) => w.code)).toEqual(["FACE_TOO_SMALL"]);

    // Same numbers as running the M3/M4 steps by hand.
    const px = toPixels(fixtureFace().landmarks, img.width, img.height);
    const faces = [{ landmarksPx: px, matrix: fixtureFace().matrix }];
    expect(r.summary).toEqual(summarizePhoto(sampleSkin(img, px), assessQuality(img, faces)));
  });

  it("keeps only a few numbers: no pixels, pixel indices or landmarks survive", () => {
    const r = analysePhoto(loadFixtureImage(), [fixtureFace()]);
    const json = JSON.stringify(r);
    expect(json.length).toBeLessThan(1000);
    expect(json).not.toMatch(/landmarks|Indices|geometry|"x"|"y"/);
    // It crosses the worker boundary, so it must survive structured cloning unchanged.
    expect(structuredClone(r)).toEqual(r);
  });

  it("the summary scores like before (warnings count as overridden)", () => {
    const r = analysePhoto(loadFixtureImage(), [fixtureFace()]);
    if (r.kind !== "analysed") throw new Error("expected analysed");
    const score = scorePhoto(r.summary, {});
    expect(score.photoConfidence.factors.map((f) => f.reason)).toContain("FACE_TOO_SMALL");
    expect(score.confidence).toBeGreaterThan(0);
  });

  it("blocks without a face", () => {
    const img = solidImage(64, 64, { r: 200, g: 180, b: 160 });
    expect(analysePhoto(img, [])).toEqual({ kind: "blocked", reason: "NO_FACE" });
  });

  it("blocks with more than one face", () => {
    expect(analysePhoto(loadFixtureImage(), [fixtureFace(), fixtureFace()])).toEqual({
      kind: "blocked",
      reason: "MULTIPLE_FACES",
    });
  });

  it("blocks when no skin region keeps enough pixels (a tiny face)", () => {
    // The fixture's face shrunk to ~3% of the image width: every region falls below 300 pixels.
    const f = fixtureFace();
    const shrink = 0.12;
    const tiny: DetectedFace = {
      matrix: f.matrix,
      landmarks: f.landmarks.map((p) => ({
        x: 0.5 + (p.x - 0.5) * shrink,
        y: 0.5 + (p.y - 0.5) * shrink,
      })),
    };
    expect(analysePhoto(loadFixtureImage(), [tiny])).toEqual({
      kind: "blocked",
      reason: "NOT_ENOUGH_SKIN",
    });
  });
});
