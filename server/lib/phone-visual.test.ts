import { describe,it,expect } from "vitest";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { PHONE_FLOW_GLSL, phoneFluidFragment, phoneFluidOptions, createPhoneNoiseTable } from "../../src/components/mobile/phone-fluid-shaders";
import { advancePhoneQuality,splitPhoneHeadline,PHONE_QUERY,type PhoneQuality } from "../../contracts/phone-visual";
describe("phone-only visual revision",()=>{
 it("keeps the headline meaning while separating the lead from the emphasis",()=>{const title="把业务问题，做成可运行的产品。";const parts=splitPhoneHeadline(title);expect(parts.lead+parts.emphasis).toBe(title);expect(parts.emphasis).toBe("可运行的产品。");expect(splitPhoneHeadline("新的主张").emphasis).toBe("新的主张");});
 it("does not degrade after one transient slow sample and stays bounded",()=>{let q:PhoneQuality={value:1,slow:0,stable:0};expect(advancePhoneQuality(q,15).value).toBe(1);for(let i=0;i<30;i++)q=advancePhoneQuality(q,18);expect(q.value).toBe(.8);});
 it("recovers quality gradually after sustained stable frames",()=>{let q:PhoneQuality={value:.8,slow:0,stable:0};for(let i=0;i<16;i++)q=advancePhoneQuality(q,32);expect(q.value).toBe(1);expect(advancePhoneQuality(q,NaN)).toBe(q);});
 it("limits the profile to phone width or touch landscape",()=>{expect(PHONE_QUERY).toContain("max-width: 760px");expect(PHONE_QUERY).toContain("pointer: coarse");});
 // The owner explicitly requested denser desktop stars on 2026-10-24.
 // Keep protecting the original flow and luminous surface while allowing that change.
 it("retains the desktop flow and luminous surface",async()=>{const source=await readFile("src/components/DesktopTechScene.tsx","utf8");const flow=source.slice(source.indexOf("const flowGLSL = `"),source.indexOf("export default"));const surface=source.slice(source.indexOf("    const surface = "),source.indexOf("    const count = "));expect(createHash("sha256").update(flow+surface).digest("hex")).toBe("e354e4bd6f429fd40db798389874dc4344400235def79472c0409feadb7e907f");});
 it("retains the original flow, color composition and particle artwork on phones",async()=>{
   const desktop=await readFile("src/components/DesktopTechScene.tsx","utf8"),phone=await readFile("src/components/mobile/MobileTechScene.tsx","utf8");
   const shaders=(source:string)=>[...source.matchAll(/(?:vertexShader|fragmentShader):\s*`([\s\S]*?)`/g)].map(match=>match[1]);
   const field=desktop.match(/const flowGLSL = `([\s\S]*?)`;/)?.[1];
   expect(PHONE_FLOW_GLSL).toBe(field);
   expect(phoneFluidFragment("original")).toBe(shaders(desktop)[0].replace("${flowGLSL}",PHONE_FLOW_GLSL));
   expect(shaders(phone)).toEqual(shaders(desktop).slice(1));
 });
 it("isolates compatibility arithmetic without changing the flow and palette",()=>{
   for(const mode of ["powers","stable"] as const){
     const fragment=phoneFluidFragment(mode);
     expect(fragment).not.toMatch(/\bpow\s*\(/);
     expect(fragment).toContain("clamp(.5 + .5 * sin");
     expect(fragment).toContain("folds4 * folds4 * folds");
     expect(fragment).toContain("vec3(.10,.71,.91)");
   }
   expect(phoneFluidFragment("powers")).toContain("123.34, 456.21");
   expect(phoneFluidFragment("stable")).not.toContain("123.34, 456.21");
   expect(phoneFluidFragment("stable")).toContain("texelFetch(uNoiseTable, cell, 0).r");
 });
 it("makes a bounded, deterministic lattice with varied noise and exact zero origin",()=>{
   const first=createPhoneNoiseTable();
   expect(first.byteLength).toBe(256*256*4);
   expect(first).toEqual(createPhoneNoiseTable());
   expect(first.every(value=>Number.isFinite(value)&&value>=0&&value<1)).toBe(true);
   expect(first[128*256+128]).toBe(0);
   expect(new Set(first).size).toBeGreaterThan(1000);
 });
 it("requires the explicit versioned probe for diagnostic overrides",()=>{
   expect(phoneFluidOptions("")).toEqual({debug:false,mode:"stable"});
   expect(phoneFluidOptions("?fluidMode=original")).toEqual({debug:false,mode:"stable"});
   expect(phoneFluidOptions("?gpu=F4&fluidMode=original")).toEqual({debug:true,mode:"original"});
   expect(phoneFluidOptions("?gpu=F4&fluidMode=arbitrary")).toEqual({debug:true,mode:"stable"});
 });

 it("uses one direct draw without intermediate texture sampling on phones",async()=>{const phone=await readFile("src/components/mobile/MobileTechScene.tsx","utf8");expect(phone).not.toContain("WebGLRenderTarget");expect(phone).not.toContain("texture2D(");expect(phone).not.toContain("setRenderTarget(");expect(phone.match(/renderer\.render\(/g)).toHaveLength(1);});

});
