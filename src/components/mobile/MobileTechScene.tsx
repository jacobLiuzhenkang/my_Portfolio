import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useSceneMotion } from "@/hooks/use-scene-motion";
import { advancePhoneQuality, type PhoneQuality } from "@contracts/phone-visual";

const TAU = Math.PI * 2;
// Both the luminous surface and the points sample this same velocity field.
const flowGLSL = `
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

export default function MobileTechScene() {
  const host = useRef<HTMLDivElement>(null);
  const { enabled } = useSceneMotion();
  const initialEnabled = useRef(enabled);
  const control = useRef<(running: boolean) => void>(() => {});

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: false,
        powerPreference: "low-power",
      });
    } catch {
      element.dataset.fallback = "true";
      return;
    }
    element.dataset.instance = crypto.randomUUID();
    let running = initialEnabled.current;
    let lost = false;
    let lastFrame = 0;
    let phase = 0;
    let quality: PhoneQuality = {value:1,slow:0,stable:0};
    let nextFrame = 0;
    let requested = initialEnabled.current;
    let statStart = 0;
    let statFrames = 0;
    let scrollDirty = true;
    let targetScroll = 0;
    let targetReading = 0;
    let targetGather = 0;
    const targetPointer = new THREE.Vector2(0.45, 0.12);
    const wake = new THREE.Vector2();
    const uniforms = {
      uPhase: { value: 0 },
      uScroll: { value: 0 },
      uAspect: { value: 1 },
      uReading: { value: 0 },
      uGather: { value: 0 },
      uPointer: { value: targetPointer.clone() },
      uWake: { value: wake.clone() },
      uPixelRatio: { value: 1 },
    };
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const surface = new THREE.ShaderMaterial({
      uniforms,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      vertexShader:
        "varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }",
      fragmentShader: `precision highp float; varying vec2 vUv; ${flowGLSL}
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
        }`,
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), surface);
    plane.frustumCulled = false;
    // Match the original direct rendering path. Avoid an intermediate texture and
    // a second, mediump sampling pass on Android/WebView GPU drivers.
    scene.add(plane);

    const count = 16000;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    let randomSeed = 20261024;
    const rand = () => {
      randomSeed = (Math.imul(randomSeed, 1664525) + 1013904223) >>> 0;
      return randomSeed / 4294967296;
    };
    for (let i = 0; i < count; i++) {
      // Keep a continuous sky across the reading side, with extra stars on the left.
      positions[i * 3] =
        rand() < 0.34 ? rand() * 1.3 - 1.3 : rand() * 2.6 - 1.3;
      positions[i * 3 + 1] =
        rand() < 0.22
          ? positions[i * 3] * 0.38 + (rand() - 0.5) * 0.85
          : rand() * 2.6 - 1.3;
      seeds[i] = rand();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    const pointsMaterial = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `attribute float aSeed; varying float vSeed; varying float vAlpha; uniform float uPixelRatio; ${flowGLSL}
        void main() {
          float depth = .28 + floor(aSeed * 3.0) * .36;
          vec2 p = position.xy * vec2(uAspect, 1.0);
          p += vec2(uScroll * .7, -uScroll * .4);
          vec2 velocity = flow(p);
          p += velocity * (.08 + aSeed * .13);
          p += vec2(sin(uPhase + aSeed * 6.28), cos(uPhase + aSeed * 6.28)) * (.016 + depth * .035);
          p += uPointer * (.012 + depth * .045);
          vec2 center = vec2(.54 * uAspect, .03);
          p = mix(p, center + normalize(p-center + .001) * (.25 + aSeed * .7), uGather * .24);
          p.x /= uAspect;
          gl_Position = vec4(p, 0.0, 1.0);
          gl_PointSize = (1.05 + depth * 1.75 + step(.99,aSeed) * 4.4) * uPixelRatio;
          vSeed = aSeed;
          vAlpha = (.42 + .5 * depth) * (.88 + .12 * sin(uPhase * (2.0 + floor(aSeed * 3.0)) + aSeed * 6.28));
          vAlpha *= mix(1.1, 1.0, smoothstep(-.85,.25,p.x)) * (1.0-uReading*.22);
        }`,
      fragmentShader: `precision mediump float; varying float vSeed; varying float vAlpha;
        void main() {
          vec2 p = gl_PointCoord-.5;
          float d = length(p);
          float bright = step(.99,vSeed);
          float core = exp(-d*d*28.0);
          float halo = exp(-d*d*8.0) * bright * .13;
          float rayX = (1.0-smoothstep(.0,.035,abs(p.y))) * (1.0-smoothstep(.08,.5,abs(p.x)));
          float rayY = (1.0-smoothstep(.0,.035,abs(p.x))) * (1.0-smoothstep(.08,.5,abs(p.y)));
          vec3 color = mix(vec3(.55,.76,.98), vec3(.94,.98,1.0), step(.4,vSeed));
          color = mix(color, vec3(.86,.96,.48), step(.9985,vSeed));
          gl_FragColor = vec4(color, (core + halo + (rayX+rayY)*bright*.3)*vAlpha);
        }`,
    });
    const points = new THREE.Points(geometry, pointsMaterial);
    points.frustumCulled = false;
    scene.add(points);
    renderer.domElement.setAttribute("aria-hidden", "true");
    element.appendChild(renderer.domElement);

    const measureScroll = () => {
      const distance = Math.max(
        1,
        document.documentElement.scrollHeight - innerHeight
      );
      targetScroll = Math.min(1, Math.max(0, scrollY / distance));
      const sections = Array.from(
        document.querySelectorAll<HTMLElement>(
          "main [data-scene], footer[data-scene]"
        )
      );
      const anchor = innerHeight * 0.45;
      const active = sections.find(section => {
        const r = section.getBoundingClientRect();
        return r.top <= anchor && r.bottom >= anchor;
      });
      const mood =
        targetScroll > 0.995 ? "contact" : (active?.dataset.scene ?? "intro");
      targetReading =
        mood === "work"
          ? 0.65
          : mood === "process"
            ? 0.35
            : mood === "growth"
              ? 0.22
              : 0;
      targetGather = mood === "contact" ? 1 : 0;
      element.dataset.activeScene = mood;
      element.dataset.progress = targetScroll.toFixed(3);
      scrollDirty = false;
    };
    const resize = () => {
      const width = Math.max(1, element.clientWidth),
        height = Math.max(1, element.clientHeight);
      // Keep the procedural field at the same bounded CSS-pixel budget as the
      // previous fluid pass, without an extra high-resolution composite pass.
      const pixelRatio = Math.min(devicePixelRatio || 1, 1) * quality.value;
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width,height,false);
      uniforms.uAspect.value=width/height;
      uniforms.uPixelRatio.value=pixelRatio;
      geometry.setDrawRange(0,1700);
      element.dataset.pixelRatio=pixelRatio.toFixed(2);
      scrollDirty = true;
    };
    const draw = (now: number) => {
      if (document.hidden || lost) return;
      const interval = 1000/30;
      if (running && nextFrame && now+.75<nextFrame) return;
      const delta = lastFrame ? Math.min((now-lastFrame)/1000,.08) : .025;
      lastFrame=now;
      if(running)nextFrame=!nextFrame||now-nextFrame>interval*2 ? now+interval : nextFrame+interval;
      if (scrollDirty) measureScroll();
      if (running) phase = (phase + (delta * TAU) / 28) % TAU;
      const blend = running ? 1 - Math.exp(-delta * 3.5) : 1;
      uniforms.uPhase.value = phase;
      if(running) uniforms.uScroll.value = THREE.MathUtils.lerp(
        uniforms.uScroll.value,
        targetScroll,
        blend
      );
      uniforms.uReading.value = THREE.MathUtils.lerp(
        uniforms.uReading.value,
        targetReading,
        blend
      );
      if(running) uniforms.uGather.value = THREE.MathUtils.lerp(
        uniforms.uGather.value,
        targetGather,
        blend
      );
      if (running) {
        uniforms.uPointer.value.lerp(targetPointer, 1 - Math.exp(-delta * 7));
        wake.multiplyScalar(Math.exp(-delta * 2));
      }
      uniforms.uWake.value.copy(wake);
      renderer.render(scene, camera);
      statFrames++;
      if (!statStart) statStart = now;
      if (now - statStart > 2000) {
        const fps = (statFrames * 1000) / (now - statStart);
        element.dataset.fps = String(Math.round(fps));
        element.dataset.phase = phase.toFixed(3);
        element.dataset.quality = quality.value.toFixed(2);
        if(running){const next=advancePhoneQuality(quality,fps);const changed=next.value!==quality.value;quality=next;if(changed)resize();}
        statStart = now;
        statFrames = 0;
      }
    };
    const applyMotion = () => {
      running = requested && !document.body.classList.contains("dialog-open");
      renderer.setAnimationLoop(null);
      lastFrame = 0;
      nextFrame = 0;
      statStart = 0;
      statFrames = 0;
      element.dataset.motion = running ? "running" : "static";
      if (!running) wake.set(0, 0);
      if (!document.hidden && !lost) {
        if (running) renderer.setAnimationLoop(draw);
        else draw(performance.now());
      }
    };
    const configure=(next:boolean)=>{requested=next;applyMotion();};
    control.current = configure;
    const dialogObserver=new MutationObserver(applyMotion);
    dialogObserver.observe(document.body,{attributes:true,attributeFilter:["class"]});
    element.dataset.profile="phone-original";
    element.dataset.fluidPipeline="direct";
    const onScroll = () => {
      scrollDirty = true;
      if (!running) draw(performance.now());
    };
    const onResize = () => {
      resize();
      if (!running) draw(performance.now());
    };
    const onPointer = (event: PointerEvent) => {
      if (!running || event.pointerType === "touch") return;
      const x = (event.clientX / Math.max(1, innerWidth)) * 2 - 1;
      const y = 1 - (event.clientY / Math.max(1, innerHeight)) * 2;
      wake
        .add(
          new THREE.Vector2(
            x - targetPointer.x,
            y - targetPointer.y
          ).multiplyScalar(0.9)
        )
        .clampLength(0, 0.28);
      targetPointer.set(x, y);
    };
    const onVisibility = () => applyMotion();
    const onLost = (event: Event) => {
      event.preventDefault();
      lost = true;
      renderer.setAnimationLoop(null);
      element.dataset.fallback = "true";
    };
    const onRestored = () => {
      lost = false;
      delete element.dataset.fallback;
      resize();
      applyMotion();
    };
    const observer = new ResizeObserver(onScroll);
    observer.observe(document.documentElement);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    renderer.domElement.addEventListener("webglcontextlost", onLost);
    renderer.domElement.addEventListener("webglcontextrestored", onRestored);
    resize();
    applyMotion();
    element.dataset.ready = "true";
    return () => {
      control.current = () => {};
      renderer.setAnimationLoop(null);
      observer.disconnect();
      dialogObserver.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      renderer.domElement.removeEventListener("webglcontextlost", onLost);
      renderer.domElement.removeEventListener(
        "webglcontextrestored",
        onRestored
      );
      geometry.dispose();
      pointsMaterial.dispose();
      plane.geometry.dispose();
      surface.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);
  useEffect(() => control.current(enabled), [enabled]);
  return <div className="tech-scene" ref={host} aria-hidden="true" />;
}
