import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  profile: { resumeFileKey: null as string | null },
  pdf: new Uint8Array([37, 80, 68, 70, 45]) as Uint8Array | null,
  stored: vi.fn(),
}));
vi.mock("../queries/connection", () => ({
  getDb: () => ({
    select: () => ({
      from: () => ({ orderBy: () => ({ limit: async () => [state.profile] }) }),
    }),
  }),
}));
vi.mock("../lib/resume-file", () => ({
  loadBundledResume: async () => state.pdf,
}));
vi.mock("../lib/storage", async original => ({
  ...(await original<typeof import("../lib/storage")>()),
  storage: { getPresignedUrl: state.stored },
}));
import { resumeRoutes } from "./resume";
import { StorageError } from "../lib/storage";

const app = new Hono().route("/api/resume", resumeRoutes);
beforeEach(() => {
  state.profile.resumeFileKey = null;
  state.pdf = new Uint8Array([37, 80, 68, 70, 45]);
  state.stored.mockReset();
});
describe("public resume delivery", () => {
  it("provides a downloadable PDF without provisioned cloud storage", async () => {
    const response = await app.request("/api/resume/download");
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toMatch(
      /^attachment;.*filename\*=UTF-8/
    );
    expect(await response.text()).toBe("%PDF-");
    expect(state.stored).not.toHaveBeenCalled();
  });
  it("uses inline delivery for online preview", async () => {
    const response = await app.request("/api/resume/download?preview=1");
    expect(response.headers.get("Content-Disposition")).toMatch(/^inline;/);
  });
  it("preserves administrator-uploaded resume delivery when storage is available", async () => {
    state.profile.resumeFileKey = "resumes/current.pdf";
    state.stored.mockResolvedValue({
      url: "https://example.com/signed-resume.pdf",
    });
    const response = await app.request("/api/resume/download?preview=1");
    expect(response.status).toBe(302);
    expect(state.stored).toHaveBeenCalledWith({
      key: "resumes/current.pdf",
      download: false,
    });
  });
  it("uses the bundled copy when an imported key has no local storage credentials", async () => {
    state.profile.resumeFileKey = "resumes/current.pdf";
    state.stored.mockRejectedValue(
      new StorageError("STORAGE_NOT_PROVISIONED", "Unavailable locally", false)
    );
    expect((await app.request("/api/resume/download")).status).toBe(200);
  });
  it("returns an explicit 404 if neither source exists", async () => {
    state.pdf = null;
    expect((await app.request("/api/resume/download")).status).toBe(404);
  });
  it("does not disguise a failed storage permission as a different document", async () => {
    state.profile.resumeFileKey = "resumes/current.pdf";
    state.stored.mockRejectedValue(
      new StorageError("STORAGE_FORBIDDEN", "Denied", false)
    );
    const quietApp = new Hono()
      .onError(() => new Response("Storage failed", { status: 502 }))
      .route("/api/resume", resumeRoutes);
    expect((await quietApp.request("/api/resume/download")).status).toBe(502);
  });
});
