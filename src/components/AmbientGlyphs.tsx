import { useEffect, useRef } from "react";

export default function AmbientGlyphs() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let raf = 0;
    let last = 0;
    let pointerX = -1000;
    let pointerY = -1000;
    const glyphs = ["·", "+", "0", "1", "×"];

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "10px ui-monospace, monospace";
      const step = width < 600 ? 34 : 42;
      for (let y = step / 2; y < height; y += step) {
        for (let x = step / 2; x < width; x += step) {
          const seed = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
          const index = Math.abs(Math.floor(seed)) % glyphs.length;
          const wave = reduced ? 0.4 : (Math.sin(time * 0.00032 + x * 0.013 + y * 0.009) + 1) / 2;
          const distance = Math.hypot(x - pointerX, y - pointerY);
          const proximity = Math.max(0, 1 - distance / 230);
          ctx.fillStyle = `rgba(176, 255, 196, ${0.025 + wave * 0.055 + proximity * 0.22})`;
          ctx.fillText(glyphs[index], x, y);
        }
      }
    };

    const tick = (time: number) => {
      if (time - last > 42) {
        draw(time);
        last = time;
      }
      raf = requestAnimationFrame(tick);
    };
    const onPointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerX = event.clientX - rect.left;
      pointerY = event.clientY - rect.top;
      if (reduced) draw(0);
    };
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduced) raf = requestAnimationFrame(tick);
    };

    resize();
    draw(0);
    if (!reduced) raf = requestAnimationFrame(tick);
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas className="ambient-glyphs" ref={ref} aria-hidden="true" />;
}
