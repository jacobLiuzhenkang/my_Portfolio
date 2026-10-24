import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const base = (process.env.PORTFOLIO_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const target = new URL(base);
assert(target.protocol === "https:" || ["localhost", "127.0.0.1"].includes(target.hostname), "Use HTTPS outside local testing.");
const credentials = JSON.parse(await fs.readFile(process.env.PORTFOLIO_LOGIN_FILE, "utf8"));
let cookie = "";
async function rpc(name, input, mutation = false, authenticated = true, origin = base) {
  const response = await fetch(`${base}/api/trpc/${name}`, {
    method: mutation ? "POST" : "GET",
    headers: { ...(mutation ? { "Content-Type": "application/json", Origin: new URL(origin).origin } : {}), ...(authenticated && cookie ? { Cookie: cookie } : {}) },
    ...(mutation ? { body: JSON.stringify({ json: input }) } : {}),
  });
  const payload = await response.json();
  return { response, data: payload.result?.data?.json, error: payload.error?.json };
}

try {
  const publicData = await rpc("content.public");
  assert.equal(publicData.response.status, 200);
  assert(publicData.data.profile?.fullName);
  assert.equal(publicData.data.projects.length, 7);
  const denied = await rpc("storage.prepareUpload", { name: "probe.pdf", contentType: "application/pdf", size: 20, purpose: "file" }, true, false);
  assert.equal(denied.response.status, 401);
  const login = await rpc("auth.login", { username: credentials.username, password: credentials.password }, true, false);
  assert.equal(login.response.status, 200);
  const setCookie = login.response.headers.get("set-cookie");
  assert(setCookie?.includes("HttpOnly") && setCookie.includes("SameSite=Lax"));
  if (process.env.PORTFOLIO_EXPECT_SECURE === "1") assert(setCookie.includes("Secure"));
  cookie = setCookie.split(";")[0];
  const status = await rpc("auth.status");
  assert.equal(status.data.user.username, credentials.username);
  const content = await rpc("content.admin");
  assert.equal(content.response.status, 200);
  const crossSite = await rpc("content.updateProfile", content.data.profile, true, true, "https://another-site.example");
  assert.equal(crossSite.response.status, 403);
  if (process.env.PORTFOLIO_WRITE_SMOKE === "1") {
    const saved = await rpc("content.updateProfile", content.data.profile, true);
    assert.equal(saved.response.status, 200);
    assert.equal((await rpc("content.public")).data.profile.headline, content.data.profile.headline);
    const project = { title: "Hidden runtime verification", subtitle: "Verification", category: "Verification", description: "Hidden test record", content: "Hidden test record", tags: ["verification"], coverImage: null, coverKey: null, gallery: [], demoUrl: null, featured: false, published: false, sortOrder: 9999 };
    const created = await rpc("content.createProject", project, true);
    assert.equal(created.response.status, 200);
    assert(Number.isInteger(created.data.id));
    try {
      assert.equal((await rpc("content.updateProject", { id: created.data.id, data: { ...project, description: "Verified" } }, true)).response.status, 200);
      assert(!(await rpc("content.public")).data.projects.some(item => item.id === created.data.id));
    } finally { await rpc("content.deleteProject", { id: created.data.id }, true); }
    const experience = { company: "Hidden runtime verification", role: "Verification", period: "Verification", summary: "Hidden test record", achievements: ["Verification"], sortOrder: 9999, published: false };
    const added = await rpc("content.createExperience", experience, true);
    assert.equal(added.response.status, 200);
    assert(Number.isInteger(added.data.id));
    try { assert.equal((await rpc("content.updateExperience", { id: added.data.id, data: experience }, true)).response.status, 200); }
    finally { await rpc("content.deleteExperience", { id: added.data.id }, true); }
    assert.equal((await rpc("content.public")).data.projects.length, 7);
  }
  const pdf = await fetch(base + "/api/resume/download?preview=1");
  assert.equal(pdf.status, 200);
  assert.match(pdf.headers.get("content-type"), /application\/pdf/);
  assert.equal(new TextDecoder().decode(new Uint8Array(await pdf.arrayBuffer()).slice(0, 5)), "%PDF-");

  if (process.env.PORTFOLIO_UPLOAD_FILE) {
    const bytes = await fs.readFile(process.env.PORTFOLIO_UPLOAD_FILE);
    const name = `storage-check-${Date.now()}-${path.basename(process.env.PORTFOLIO_UPLOAD_FILE)}`;
    const prepared = await rpc("storage.prepareUpload", { name, contentType: "application/pdf", size: bytes.length, purpose: "file" }, true);
    assert.equal(prepared.response.status, 200);
    const uploaded = await fetch(prepared.data.url, { method: "PUT", headers: { "Content-Type": "application/pdf" }, body: bytes });
    assert.equal(uploaded.status, 200);
    const finalized = await rpc("storage.finalizeUpload", { key: prepared.data.key, name, purpose: "file" }, true);
    assert.equal(finalized.response.status, 200);
    const files = await rpc("storage.list");
    const file = files.data.find(item => item.key === prepared.data.key);
    assert(file && file.canDelete);
    const signed = await fetch(file.url);
    assert.equal(signed.status, 200);
    const unsigned = new URL(file.url); unsigned.search = "";
    assert.notEqual((await fetch(unsigned)).status, 200, "Private files must reject unsigned reads.");
    const removed = await rpc("storage.remove", { key: file.key }, true);
    assert.equal(removed.response.status, 200);
    assert(!(await rpc("storage.list")).data.some(item => item.key === file.key));
  }
  console.log("Runtime checks passed: public data, owner login, mutation protection, persistence, PDF and requested storage checks.");
} finally {
  if (cookie) await rpc("auth.logout", undefined, true).catch(() => {});
}
