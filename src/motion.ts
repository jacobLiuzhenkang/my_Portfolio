import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };

export function useSmoothScroll(enabled = true) {
  const instance = useRef<Lenis | null>(null);
  useEffect(() => {
    const media = window.matchMedia(
      "(min-width: 961px) and (prefers-reduced-motion: no-preference)"
    );
    let stop = () => {};
    const configure = () => {
      stop();
      instance.current = null;
      if (!media.matches || !enabled) {
        stop = () => {};
        return;
      }
      const lenis = new Lenis({
        duration: 0.8,
        smoothWheel: true,
        syncTouch: false,
        wheelMultiplier: 1,
      });
      instance.current = lenis;
      const update = () => ScrollTrigger.update();
      const tick = (time: number) => lenis.raf(time * 1000);
      const syncDialogLock = () =>
        document.body.classList.contains("dialog-open")
          ? lenis.stop()
          : lenis.start();
      const observer = new MutationObserver(syncDialogLock);
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ["class"],
      });
      syncDialogLock();
      lenis.on("scroll", update);
      gsap.ticker.add(tick);
      stop = () => {
        observer.disconnect();
        lenis.off("scroll", update);
        gsap.ticker.remove(tick);
        lenis.destroy();
      };
    };
    configure();
    media.addEventListener("change", configure);
    return () => {
      media.removeEventListener("change", configure);
      stop();
      instance.current = null;
    };
  }, [enabled]);
  return instance;
}
