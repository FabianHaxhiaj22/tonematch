/**
 * validate:data — Zod-validates every JSON file under src/data/ (README §7.1).
 *
 * Every data file must have a schema registered in SCHEMAS (keyed by its path relative to
 * src/data/, using "*" as a wildcard for one path segment). A JSON file without a schema is an
 * error, so new data can't slip in unvalidated. Schemas are added in M5 (recommendation engine).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { z } from "zod";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = join(ROOT, "src", "data");

/** Registered schemas, e.g. { "metals.json": MetalsSchema, "copy/*.json": CopySchema }. */
const SCHEMAS: Record<string, z.ZodType> = {};

function schemaFor(relPath: string): z.ZodType | undefined {
  const parts = relPath.split("/");
  for (const [pattern, schema] of Object.entries(SCHEMAS)) {
    const p = pattern.split("/");
    if (
      p.length === parts.length &&
      p.every((seg, i) =>
        seg === "*.json" ? parts[i]?.endsWith(".json") : seg === "*" || seg === parts[i],
      )
    ) {
      return schema;
    }
  }
  return undefined;
}

function main(): void {
  if (!existsSync(DATA_DIR)) {
    console.log("validate:data ✓ no src/data/ directory yet (nothing to validate)");
    return;
  }
  const files = readdirSync(DATA_DIR, { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".json"))
    .map((f) => relative(DATA_DIR, join(DATA_DIR, f)).split(sep).join("/"))
    .sort();

  if (files.length === 0) {
    console.log("validate:data ✓ no data files yet (nothing to validate)");
    return;
  }

  let errors = 0;
  for (const rel of files) {
    const schema = schemaFor(rel);
    if (!schema) {
      console.error(`validate:data ✗ ${rel}: no schema registered in scripts/validate-data.ts`);
      errors++;
      continue;
    }
    let json: unknown;
    try {
      json = JSON.parse(readFileSync(join(DATA_DIR, rel), "utf8"));
    } catch (err) {
      console.error(
        `validate:data ✗ ${rel}: invalid JSON (${err instanceof Error ? err.message : String(err)})`,
      );
      errors++;
      continue;
    }
    const result = schema.safeParse(json);
    if (!result.success) {
      console.error(`validate:data ✗ ${rel}:`);
      for (const issue of result.error.issues) {
        console.error(`    at ${issue.path.join(".") || "(root)"}: ${issue.message}`);
      }
      errors++;
    }
  }

  if (errors > 0) {
    console.error(`validate:data ✗ ${errors} of ${files.length} file(s) failed`);
    process.exit(1);
  }
  console.log(`validate:data ✓ ${files.length} file(s) valid`);
}

main();
