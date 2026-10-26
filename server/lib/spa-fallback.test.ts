import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "../..");

async function textFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await textFiles(fullPath)));
    else if (/\.(html|json|md|txt|ts|tsx|js|mjs|css|xml|example|yml|yaml)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

describe("canonical site and SPA fallback", () => {
  it("rewrites unknown paths to index.html without taking /api", async () => {
    const config = JSON.parse(await readFile(path.join(root, "vercel.json"), "utf8"));
    const rewrites = config.rewrites as Array<{ source: string; destination: string }>;
    expect(rewrites[0]).toEqual({ source: "/api/:path*", destination: "/api" });
    const fallback = rewrites.at(-1);
    expect(fallback).toEqual({ source: "/(.*)", destination: "/index.html" });
    expect(rewrites.findIndex(rule => rule.destination === "/api")).toBeLessThan(
      rewrites.findIndex(rule => rule.destination === "/index.html")
    );
    expect(rewrites.some(rule => rule.source.startsWith("/api") && rule.destination === "/index.html")).toBe(false);
  });

  it("publishes the canonical origin, a real social image, robots, and a sitemap", async () => {
    const html = await readFile(path.join(root, "index.html"), "utf8");
    const robots = await readFile(path.join(root, "public/robots.txt"), "utf8");
    const sitemap = await readFile(path.join(root, "public/sitemap.xml"), "utf8");
    expect(html).toContain("https://www.liuzhenkang.cn/brand/jacob/symbol.png");
    expect(html).toContain('rel="canonical" href="https://www.liuzhenkang.cn/"');
    expect(robots).toContain("Sitemap: https://www.liuzhenkang.cn/sitemap.xml");
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain("Disallow: /api/");
    for (const slug of ["viform", "sac", "seashine", "memoring", "shike", "ip", "other"]) {
      expect(sitemap).toContain(`https://www.liuzhenkang.cn/work/${slug}`);
    }
    expect(sitemap).not.toContain("/admin");
  });

  it("does not mention the old preview subdomain in tracked text", async () => {
    const hits: string[] = [];
    for (const file of await textFiles(root)) {
      const text = await readFile(file, "utf8");
      const previewHost = ["my-portfolio", "sepia-iota"].join("-") + ".vercel.app";
      if (text.includes(previewHost)) hits.push(path.relative(root, file));
    }
    expect(hits).toEqual([]);
  });
});
