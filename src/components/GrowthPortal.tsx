import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/motion";

export default function GrowthPortal() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const media = gsap.matchMedia();
    media.add("(min-width: 961px) and (prefers-reduced-motion: no-preference)", () => {
      element.classList.add("is-motion");
      const context = gsap.context(() => {
        const image = element.querySelector("img");
        const first = element.querySelector(".pf-portal-first");
        const second = element.querySelector(".pf-portal-second");
        gsap.set(second, { opacity: 0, y: 90 });
        const timeline = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: { trigger: element, start: "top top", end: "bottom bottom", scrub: 0.8 },
        });
        timeline
          .to(element.querySelector(".pf-portal-media"), { clipPath: "inset(0% 0% 0% 0%)", duration: 1 }, 0)
          .fromTo(image, { scale: 1.22 }, { scale: 1.03, duration: 1.6 }, 0)
          .to(first, { opacity: 0, y: -80, duration: 0.4 }, 0.72)
          .to(second, { opacity: 1, y: 0, duration: 0.4 }, 0.72)
          .to(element.querySelector(".pf-portal-orbit"), { rotate: 140, scale: 1.35, duration: 1.6 }, 0);
      }, element);
      const image = element.querySelector("img");
      image?.decode().catch(() => undefined).then(() => ScrollTrigger.refresh());
      return () => {
        context.revert();
        element.classList.remove("is-motion");
      };
    });
    return () => media.revert();
  }, []);

  return (
    <section className="pf-portal" ref={root} aria-label="从设计走向产品交付">
      <div className="pf-portal-stage">
        <div className="pf-portal-media">
          <img src="/images/motion/future-city.jpg" alt="" width="2200" height="1466" loading="lazy" />
        </div>
        <div className="pf-portal-vignette" />
        <div className="pf-portal-orbit" aria-hidden="true"><i /><i /></div>
        <div className="pf-portal-copy pf-width">
          <p>THE SHIFT / 角色不再限制抵达</p>
          <h2 className="pf-portal-first">DESIGN WAS<br /><span>THE BEGINNING.</span></h2>
          <h2 className="pf-portal-second">PRODUCT IS<br /><span>THE ANSWER.</span></h2>
          <small>从表达体验，到实现体验。</small>
        </div>
      </div>
    </section>
  );
}
