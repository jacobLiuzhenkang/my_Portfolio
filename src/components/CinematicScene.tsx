import { useEffect, useRef, type CSSProperties } from "react";
import { gsap, ScrollTrigger } from "@/motion";

export default function CinematicScene() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const media = gsap.matchMedia();
    let cancelled = false;

    media.add("(min-width: 961px) and (prefers-reduced-motion: no-preference)", () => {
      element.classList.add("is-motion");
      const context = gsap.context(() => {
        const scenes = gsap.utils.toArray<HTMLElement>(".pf-cinema-scene", element);
        const blinds = gsap.utils.toArray<HTMLElement>(".pf-cinema-blind", element);
        const copies = scenes.map((scene) => scene.querySelector(".pf-cinema-copy"));
        const progress = element.querySelector(".pf-cinema-progress i");
        const machineShade = element.querySelector(".pf-cinema-machine .pf-cinema-shade");
        const firstImage = scenes[0]?.querySelector("img");
        const productImage = scenes[2]?.querySelector("img");

        gsap.set(blinds, { scaleY: 0 });
        gsap.set(scenes[2], { clipPath: "circle(0% at 50% 50%)" });
        gsap.set([copies[1], copies[2]], { opacity: 0, y: 80 });
        gsap.set(machineShade, { opacity: 0 });
        gsap.set(progress, { scaleY: 0, transformOrigin: "top" });

        const timeline = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: element,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.75,
            invalidateOnRefresh: true,
          },
        });

        timeline
          .to(scenes[0], { clipPath: "inset(0% 0% 0% 0%)", duration: 0.8 }, 0)
          .fromTo(firstImage, { scale: 1.17 }, { scale: 1.02, duration: 0.8 }, 0)
          .to(copies[0], { opacity: 0, y: -70, duration: 0.35 }, 0.62)
          .to(blinds, { scaleY: 1, duration: 0.58, stagger: { each: 0.035, from: "center" } }, 0.9)
          .to(machineShade, { opacity: 1, duration: 0.58 }, 0.9)
          .fromTo(".pf-cinema-blind img", { scale: 1.14 }, { scale: 1.02, duration: 0.9 }, 0.9)
          .to(copies[1], { opacity: 1, y: 0, duration: 0.35 }, 1.25)
          .to(copies[1], { opacity: 0, y: -60, duration: 0.3 }, 1.88)
          .to(scenes[2], { clipPath: "circle(150% at 50% 50%)", duration: 0.85 }, 1.98)
          .fromTo(productImage, { scale: 1.16 }, { scale: 1.03, duration: 0.85 }, 1.98)
          .to(copies[2], { opacity: 1, y: 0, duration: 0.35 }, 2.35)
          .to(progress, { scaleY: 1, duration: 2.75 }, 0);
      }, element);

      const images = Array.from(element.querySelectorAll("img"));
      Promise.all(images.map((image) => image.decode().catch(() => undefined))).then(() => {
        if (cancelled) return;
        ScrollTrigger.sort();
        ScrollTrigger.refresh();
      });
      return () => {
        context.revert();
        element.classList.remove("is-motion");
      };
    });

    return () => {
      cancelled = true;
      media.revert();
    };
  }, []);

  return (
    <section className="pf-cinema" ref={root} aria-label="从人与 AI 到真实产品的视觉叙事">
      <div className="pf-cinema-stage">
        <article className="pf-cinema-scene pf-cinema-human">
          <img src="/images/motion/chrome-sculpture.avif" alt="" width="3000" height="1950" />
          <div className="pf-cinema-shade" />
          <div className="pf-cinema-copy">
            <p>01 / HUMAN INTUITION</p>
            <h2>FROM<br /><span>INTUITION.</span></h2>
            <small>以人的判断，定义值得解决的问题。</small>
          </div>
        </article>

        <article className="pf-cinema-scene pf-cinema-machine">
          <div className="pf-cinema-blinds" aria-hidden="true">
            {Array.from({ length: 12 }, (_, index) => (
              <div className="pf-cinema-blind" key={index} style={{ left: `${(index * 100) / 12}%` } as CSSProperties}>
                <img src="/images/motion/future-city.jpg" alt="" width="2200" height="1466" style={{ left: `${(-index * 100) / 12}vw` }} />
              </div>
            ))}
          </div>
          <div className="pf-cinema-shade" />
          <div className="pf-cinema-copy">
            <p>02 / MACHINE CAPABILITY</p>
            <h2>WITH<br /><span>MACHINE.</span></h2>
            <small>让 Agent 扩展执行，让想象获得计算能力。</small>
          </div>
        </article>

        <article className="pf-cinema-scene pf-cinema-product">
          <img src="/images/motion/black-glass-product.avif" alt="" width="3200" height="1906" />
          <div className="pf-cinema-shade" />
          <div className="pf-cinema-copy">
            <p>03 / REAL PRODUCT</p>
            <h2>INTO<br /><span>REALITY.</span></h2>
            <small>不止于画面，最终成为可使用、可交付的产品。</small>
          </div>
        </article>

        <div className="pf-cinema-progress" aria-hidden="true"><span>SCROLL FILM</span><b><i /></b><small>03 SCENES</small></div>
      </div>
    </section>
  );
}
