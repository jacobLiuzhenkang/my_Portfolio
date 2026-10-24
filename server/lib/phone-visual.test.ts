import { describe,it,expect } from "vitest";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { advancePhoneQuality,splitPhoneHeadline,PHONE_QUERY,type PhoneQuality } from "../../contracts/phone-visual";
describe("phone-only visual revision",()=>{
 it("keeps the headline meaning while emphasizing the product statement",()=>{const s="把业务问题，做成可运行的产品。",p=splitPhoneHeadline(s);expect(p.lead+p.emphasis).toBe(s);expect(p.emphasis).toBe("可运行的产品。");expect(splitPhoneHeadline("新的主张").emphasis).toBe("新的主张");});
 it("ignores transient slow frames and bounds the fluid sampling budget",()=>{let q:PhoneQuality={value:1,slow:0,stable:0};expect(advancePhoneQuality(q,15).value).toBe(1);for(let i=0;i<30;i++)q=advancePhoneQuality(q,18);expect(q.value).toBe(.8);});
 it("recovers after sustained stable frames",()=>{let q:PhoneQuality={value:.8,slow:0,stable:0};for(let i=0;i<16;i++)q=advancePhoneQuality(q,32);expect(q.value).toBe(1);expect(advancePhoneQuality(q,NaN)).toBe(q);});
 it("limits the new profile to phone width and touch landscape",()=>{expect(PHONE_QUERY).toContain("max-width: 760px");expect(PHONE_QUERY).toContain("pointer: coarse");});
 it("keeps the published desktop renderer intact",async()=>{const s=await readFile("src/components/DesktopTechScene.tsx");expect(createHash("sha256").update(s).digest("hex")).toBe("832f7c1839c89461dbc99748a0c584e6ff32d2d7e3d423ea0d46d9cc2cc9ab68");});
 it("keeps the original fluid and particle shader artwork on phones",async()=>{const s=await readFile("src/components/mobile/MobileTechScene.tsx","utf8");const parts=[...s.matchAll(/(?:vertexShader|fragmentShader):\s*`([\s\S]*?)`/g)].map(m=>m[1]);const field=s.match(/const flowGLSL = `([\s\S]*?)`;/)?.[1];expect(createHash("sha256").update(JSON.stringify([field,...parts])).digest("hex")).toBe("a8ba8754797cfc74895c026a7482e6a6b13db0b62f7f461edea84db79e2b7116");});
});
