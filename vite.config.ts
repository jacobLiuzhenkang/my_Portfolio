import devServer from "@hono/vite-dev-server"
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises"
import path from "path"
const __dirname = import.meta.dirname
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

async function copyFileWithRetry(source: string, target: string) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const content = await readFile(source);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, content);
      return;
    } catch (error) {
      if (attempt === 5) throw error;
      await new Promise((resolve) => setTimeout(resolve, 120 * (attempt + 1)));
    }
  }
}

async function copyPublicDirectory(source: string, target: string) {
  const entries = await readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) await copyPublicDirectory(from, to);
    else await copyFileWithRetry(from, to);
  }
}

async function countFiles(directory: string): Promise<number> {
  const entries = await readdir(directory, { withFileTypes: true });
  let total = 0;
  for (const entry of entries) {
    total += entry.isDirectory() ? await countFiles(path.join(directory, entry.name)) : 1;
  }
  return total;
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  publicDir: command === "build" ? false : path.resolve(__dirname, "public"),
  plugins: [
    devServer({ entry: "api/boot.ts", exclude: [/^\/(?!api\/).*$/] }),
    inspectAttr(), react(),
    {
      name: "resilient-public-assets",
      async closeBundle() {
        if (command !== "build") return;
        const source = path.resolve(__dirname, "public");
        const target = path.resolve(__dirname, "dist/public");
        for (let attempt = 0; attempt < 5; attempt += 1) {
          await copyPublicDirectory(source, target);
          const [sourceFiles, copiedFiles, generatedFiles] = await Promise.all([
            countFiles(source),
            countFiles(target),
            countFiles(path.join(target, "assets")),
          ]);
          if (sourceFiles === copiedFiles - generatedFiles - 1) return;
          await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
        }
        throw new Error("Static asset verification failed: source and output file counts differ.");
      },
    },
  ],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@contracts": path.resolve(__dirname, "./contracts"),
      "@db": path.resolve(__dirname, "./db"),
      "db": path.resolve(__dirname, "./db"),
    },
  },
  envDir: path.resolve(__dirname),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
}));
