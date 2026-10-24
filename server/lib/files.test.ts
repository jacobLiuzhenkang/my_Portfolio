import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ head: vi.fn(), db: vi.fn(), sign: vi.fn() }));
vi.mock("../queries/connection", () => ({ getDb: state.db }));
vi.mock("./storage", () => ({ storage: { headFile: state.head, createUploadUrl: state.sign } }));
import { checkFile, makeUploadKey, registerUploadedFile, uploadPrefix } from "./files";
import { storageRouter } from "../storageRouter";

const admin = { id: 1, username: "jacob", passwordHash: "test-hash", displayName: "刘振康", createdAt: new Date(), updatedAt: new Date() };
beforeEach(() => { state.head.mockReset(); state.db.mockReset(); state.sign.mockReset(); vi.stubEnv("VERCEL_ENV", "production"); });
afterEach(() => vi.unstubAllEnvs());
describe("private portfolio uploads", () => {
  it("requires an administrator before issuing an upload URL", async () => {
    const caller = storageRouter.createCaller({ req: new Request("https://portfolio.test/api/trpc"), resHeaders: new Headers(), admin: undefined });
    await expect(caller.prepareUpload({ name: "photo.png", contentType: "image/png", size: 100, purpose: "project" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(state.sign).not.toHaveBeenCalled();
  });
  it("returns only a constrained upload URL and an owned key", async () => {
    state.sign.mockResolvedValue({ url: "https://blob.test/temporary-upload" });
    const caller = storageRouter.createCaller({ req: new Request("https://portfolio.test/api/trpc"), resHeaders: new Headers(), admin });
    const result = await caller.prepareUpload({ name: "photo.png", contentType: "image/png", size: 100, purpose: "project" });
    expect(result.key).toMatch(/^production\/u\/1\/projects\//);
    expect(Object.keys(result).sort()).toEqual(["key", "url"]);
    expect(state.sign).toHaveBeenCalledWith({ key: result.key, contentType: "image/png", maximumSizeInBytes: 100 });
  });
  it("preserves the 25 MB limit and requires PDF content for a resume", () => {
    expect(() => checkFile("application/pdf", 25 * 1024 * 1024, "resume")).not.toThrow();
    expect(() => checkFile("application/pdf", 26 * 1024 * 1024, "resume")).toThrow();
    expect(() => checkFile("image/png", 100, "resume")).toThrow();
    expect(() => checkFile("text/html", 100, "file")).toThrow();
  });
  it("normalizes filenames without changing the owner scope", () => {
    const key = makeUploadKey(1, "../../photo.png", "project");
    expect(key.startsWith(uploadPrefix(1))).toBe(true);
    expect(key.split("/")).not.toContain("..");
  });
  it("does not inspect another account's private blob", async () => {
    await expect(registerUploadedFile(1, { key: "production/u/2/files/photo.png", name: "photo.png", purpose: "file" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(state.head).not.toHaveBeenCalled();
    expect(state.db).not.toHaveBeenCalled();
  });
  it("isolates preview writes from production file paths", async () => {
    vi.stubEnv("VERCEL_ENV", "preview"); vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "1234567890abcdef");
    expect(makeUploadKey(1, "photo.png", "project")).toMatch(/^preview-1234567890ab\/u\/1\//);
    await expect(registerUploadedFile(1, { key: "production/u/1/files/photo.png", name: "photo.png", purpose: "file" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(state.head).not.toHaveBeenCalled();
  });
  it("checks the actual storage metadata instead of trusting a client claim", async () => {
    state.head.mockResolvedValue({ size: 100, contentType: "text/html" });
    await expect(registerUploadedFile(1, { key: "production/u/1/files/photo.png", name: "photo.png", purpose: "file" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(state.db).not.toHaveBeenCalled();
  });
});
