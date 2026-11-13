/**
 * MediaPipe's facial transformation matrix (canonical face model → detected face, README §6.2).
 *
 * MediaPipe returns `{ rows, columns, data }` with `data` flattened. Neither the web guide nor
 * the type definitions state the order, so it was checked on a real portrait in M2: the
 * translation appeared at data[12..14] (≈ 0.9, 15.8, −63.2) and data[3], data[7], data[11]
 * were 0, so `data` is **column-major** (OpenGL convention: each group of 4 is one column; the
 * last column is the translation, in the canonical model's units, i.e. centimetres).
 */

/** MediaPipe's matrix shape. */
export type FlatMatrix = { rows: number; columns: number; data: readonly number[] };

/** 4×4 matrix, row-major: m[row][col]. */
export type Mat4 = [
  [number, number, number, number],
  [number, number, number, number],
  [number, number, number, number],
  [number, number, number, number],
];

export type Vec3 = { x: number; y: number; z: number };

/** Convert MediaPipe's column-major flat matrix to a row-major 4×4. Throws if it isn't 4×4. */
export function toMat4(m: FlatMatrix): Mat4 {
  if (m.rows !== 4 || m.columns !== 4 || m.data.length !== 16) {
    throw new RangeError(
      `toMat4: expected a 4×4 matrix with 16 values, got ${m.rows}×${m.columns} with ${m.data.length}`,
    );
  }
  const d = m.data;
  // Column-major: element (row r, column c) is at index c * 4 + r.
  const at = (r: number, c: number) => d[c * 4 + r]!;
  return [
    [at(0, 0), at(0, 1), at(0, 2), at(0, 3)],
    [at(1, 0), at(1, 1), at(1, 2), at(1, 3)],
    [at(2, 0), at(2, 1), at(2, 2), at(2, 3)],
    [at(3, 0), at(3, 1), at(3, 2), at(3, 3)],
  ];
}

export type HeadAngles = { yaw: number; pitch: number; roll: number };

/**
 * Head angles in degrees from the rotation part of a row-major 4×4 (README §6.1 HEAD_TILTED).
 * Decomposes R = Ry(yaw) · Rx(pitch) · Rz(roll) in the canonical face model's axes (x across
 * the face, y up, z towards the camera): yaw = turning left/right, pitch = nodding, roll = tilting
 * sideways. Columns are normalised first, so a uniform scale in the matrix doesn't matter.
 * Only magnitudes are used by the quality gate; signs follow the right-hand rule.
 */
export function headAngles(m: Mat4): HeadAngles {
  // Column lengths (uniform scale) of the 3×3 rotation part.
  const s0 = Math.hypot(m[0][0], m[1][0], m[2][0]) || 1;
  const s1 = Math.hypot(m[0][1], m[1][1], m[2][1]) || 1;
  const s2 = Math.hypot(m[0][2], m[1][2], m[2][2]) || 1;
  // Normalised entries R[row][col] that the decomposition needs.
  const r02 = m[0][2] / s2;
  const r12 = m[1][2] / s2;
  const r22 = m[2][2] / s2;
  const r10 = m[1][0] / s0;
  const r11 = m[1][1] / s1;
  const deg = (rad: number) => (rad * 180) / Math.PI;
  return {
    yaw: deg(Math.atan2(r02, r22)),
    pitch: deg(Math.asin(Math.max(-1, Math.min(1, -r12)))),
    roll: deg(Math.atan2(r10, r11)),
  };
}

/** Translation part (last column) of a row-major 4×4. */
export function translationOf(m: Mat4): Vec3 {
  return { x: m[0][3], y: m[1][3], z: m[2][3] };
}
