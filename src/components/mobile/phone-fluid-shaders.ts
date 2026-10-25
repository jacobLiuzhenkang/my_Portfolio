// Preserve the original artwork; isolate two arithmetic compatibility probes.
export const PHONE_FLUID_VERSION = "F4";
export type PhoneFluidMode = "original" | "powers" | "stable";
export const DEFAULT_PHONE_FLUID_MODE: PhoneFluidMode = "stable";
export function phoneFluidOptions(search: string) {
  const query = new URLSearchParams(search);
  const debug = query.get("gpu") === PHONE_FLUID_VERSION;
  const candidate = query.get("fluidMode");
  const mode: PhoneFluidMode = debug && (candidate === "original" || candidate === "powers" || candidate === "stable") ? candidate : DEFAULT_PHONE_FLUID_MODE;
  return { debug, mode };
}
export const PHONE_FLOW_GLSL = `
  uniform float uPhase;
  uniform float uScroll;
  uniform float uAspect;
  uniform float uReading;
  uniform float uGather;
  uniform vec2 uPointer;
  uniform vec2 uWake;
  vec2 flow(vec2 p) {
    float a = sin(p.y * 1.8 + uPhase) + cos(p.x * 1.3 - uPhase);
    vec2 v = vec2(cos(a + p.y * 1.4), sin(a - p.x * 1.2));
    v += vec2(sin(p.y * 3.4 - uPhase * 2.0), cos(p.x * 2.7 + uPhase)) * 0.32;
    vec2 d = p - uPointer * vec2(uAspect, 1.0);
    float wake = exp(-dot(d, d) * 2.8);
    v += (uWake * 2.6 + vec2(-d.y, d.x) * length(uWake) * 2.5) * wake;
    return v;
  }
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + 1.), f.x), f.y);
  }
  float fbm(vec2 p) {
    float n = 0.0, amplitude = 0.52;
    for (int i = 0; i < 3; i++) { n += noise(p) * amplitude; p = mat2(.82, -.57, .57, .82) * p * 2.03 + 13.7; amplitude *= .5; }
    return n;
  }
`;
const originalHash = `  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
`;
const stableHash = `
  uniform highp sampler2D uNoiseTable;
  float hash(vec2 p) {
    // Integer texel access avoids GPU-dependent fract/dot hash arithmetic.
    // The large lattice repeats outside its bounds without clamped seams.
    ivec2 cell = (ivec2(p) + ivec2(128)) & ivec2(255);
    return texelFetch(uNoiseTable, cell, 0).r;
  }
`;
export const ORIGINAL_PHONE_FLUID_FRAGMENT = `precision highp float; varying vec2 vUv; ${PHONE_FLOW_GLSL}
        void main() {
          vec2 p = (vUv * 2.0 - 1.0) * vec2(uAspect, 1.0);
          p += vec2(uScroll * .7, -uScroll * .4);
          vec2 velocity = flow(p);
          vec2 drift = vec2(cos(uPhase), sin(uPhase)) * .28;
          vec2 warped = p + velocity * .48 + drift;
          float field = fbm(warped * 1.4 + fbm(p * 1.2 + drift));
          float folds = .5 + .5 * sin(field * 21.0 + warped.x * 1.4);
          float filament = pow(folds, 9.0) * smoothstep(.23, .66, field);
          float ribbon = smoothstep(.29, .69, field);
          float right = smoothstep(-.55, .75, vUv.x * 2.0 - 1.0);
          float light = exp(-length(p - vec2(.65 * uAspect, .15)) * .65);
          float contrast = mix(.97, .6, uReading);
          vec3 color = vec3(.009, .018, .028);
          color += vec3(.01,.37,.56) * ribbon * (.35 + light * .65) * right * contrast;
          color += vec3(.10,.71,.91) * filament * (.34 + light * .5) * right * contrast;
          color += vec3(.62,.83,.25) * pow(filament, 2.0) * .065 * uGather;
          color += vec3(.03,.20,.30) * light * .1;
          color *= .75 + .25 * (1.0 - smoothstep(.4, 1.3, length(vUv - .5)));
          gl_FragColor = vec4(color, 1.0);
        }`;
export function phoneFluidFragment(mode: PhoneFluidMode): string {
  if (mode === "original") return ORIGINAL_PHONE_FLUID_FRAGMENT;
  const safe = ORIGINAL_PHONE_FLUID_FRAGMENT
    .replace("float folds = .5 + .5 * sin(field * 21.0 + warped.x * 1.4);", "float folds = clamp(.5 + .5 * sin(field * 21.0 + warped.x * 1.4), 0.0, 1.0);")
    .replace("float filament = pow(folds, 9.0)", "float folds2 = folds * folds;\n          float folds4 = folds2 * folds2;\n          float filament = (folds4 * folds4 * folds)")
    .replace("pow(filament, 2.0)", "(filament * filament)");
  return mode === "stable" ? safe.replace(originalHash, stableHash) : safe;
}

// A float32 evaluation of the original integer-lattice hash. Build once, then
// upload a 256 KiB nearest-sampled table. No render target or per-frame upload.
export function originalLatticeHash(x: number, y: number): number {
  const f = Math.fround;
  const fract = (value: number) => f(value - Math.floor(value));
  let px = fract(f(f(x) * f(123.34)));
  let py = fract(f(f(y) * f(456.21)));
  const d = f(f(px * f(px + f(45.32))) + f(py * f(py + f(45.32))));
  px = f(px + d);
  py = f(py + d);
  return fract(f(px * py));
}
export function createPhoneNoiseTable(): Float32Array {
  const data = new Float32Array(256 * 256);
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) data[y * 256 + x] = originalLatticeHash(x - 128, y - 128);
  }
  return data;
}
