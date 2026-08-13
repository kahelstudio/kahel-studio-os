import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoots = ["app", "components", "lib"];
const sourceExtensions = new Set([".js", ".jsx", ".ts", ".tsx"]);
const forbidden = ["PAYMONGO_SECRET_KEY", "SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"];

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return sourceExtensions.has(extname(entry.name)) ? [path] : [];
  });
}

describe("client source secret boundary", () => {
  it("does not reference server secret environment variables from client modules", () => {
    const violations = sourceRoots.flatMap(sourceFiles).flatMap((path) => {
      const source = readFileSync(path, "utf8");
      if (!/^\s*["']use client["'];/m.test(source)) return [];
      return forbidden.filter((name) => source.includes(name)).map((name) => `${relative(process.cwd(), path)}: ${name}`);
    });
    expect(violations).toEqual([]);
  });
});
