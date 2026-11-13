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

/** Translation part (last column) of a row-major 4×4. */
export function translationOf(m: Mat4): Vec3 {
  return { x: m[0][3], y: m[1][3], z: m[2][3] };
}
