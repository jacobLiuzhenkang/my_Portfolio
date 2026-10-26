import { lazy, Suspense, useLayoutEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router";
import { useSmoothScroll } from "@/motion";
import {
  anchorScrollReady,
  anchorScrollTop,
  lenisAnchorOffset,
} from "@/lib/anchor-scroll";
import { isCaseSurface } from "@/lib/project-slug";
import { SceneMotionProvider } from "./SceneMotion";
import { useSceneMotion } from "@/hooks/use-scene-motion";

const TechScene = lazy(() => import("./TechScene"));

/** The outlet changes; this layout and the background clock stay mounted. */
function PublicFrame() {
  const location = useLocation();
  const { enabled } = useSceneMotion();
  const smoothScroll = useSmoothScroll(enabled);
  const pathRef = useRef({ path: location.pathname, key: "" });
  useLayoutEffect(() => {
    if (pathRef.current.key === location.key) return;
    const previousPath = pathRef.current.path;
    const preserveScroll =
      previousPath !== location.pathname &&
      isCaseSurface(previousPath) &&
      isCaseSurface(location.pathname);
    pathRef.current = { path: location.pathname, key: location.key };
    if (!preserveScroll) {
      document.title =
        location.pathname === "/guestbook"
          ? "留言板 — 刘振康"
          : location.pathname === "/growth"
            ? "我的成长 — 刘振康 · AI 产品工程师"
            : "刘振康 · AI 产品工程师";
    }
    if (preserveScroll && !location.hash) return;
    const reset = () =>
      smoothScroll.current
        ? smoothScroll.current.scrollTo(0, { immediate: true })
        : window.scrollTo({ top: 0, behavior: "instant" });
    if (!location.hash) {
      reset();
      return;
    }
    let id: string;
    try {
      id = decodeURIComponent(location.hash.slice(1));
    } catch {
      reset();
      return;
    }
    let frame = 0;
    let observer: MutationObserver | undefined;
    const scrollToTarget = (target: HTMLElement) => {
      const headerHeight =
        document.querySelector(".pf-header")?.getBoundingClientRect().height ??
        0;
      const root = document.documentElement;
      const previousBehavior = root.style.scrollBehavior;
      root.style.scrollBehavior = "auto";
      try {
        const lenis = smoothScroll.current;
        if (lenis) {
          lenis.resize();
          // `force` is required: the case dialog stops Lenis until the lock
          // class is cleared, and a stopped instance ignores scrollTo.
          lenis.scrollTo(target, {
            immediate: true,
            force: true,
            offset: lenisAnchorOffset(
              Number.parseFloat(getComputedStyle(target).scrollMarginTop),
              headerHeight
            ),
          });
          return;
        }
        window.scrollTo({
          top: anchorScrollTop(
            window.scrollY,
            target.getBoundingClientRect().top,
            headerHeight
          ),
          behavior: "instant",
        });
      } finally {
        root.style.scrollBehavior = previousBehavior;
      }
    };
    const goToAnchor = () => {
      const target = document.getElementById(id);
      const dialogOpen = document.body.classList.contains("dialog-open");
      if (!target || !anchorScrollReady(true, dialogOpen)) return false;
      scrollToTarget(target);
      // Closing <dialog> can restore the scroll captured at showModal()
      // after this layout pass. Re-apply once that restoration has run.
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const next = document.getElementById(id);
        const locked = document.body.classList.contains("dialog-open");
        if (!next || !anchorScrollReady(true, locked)) return;
        scrollToTarget(next);
      });
      return true;
    };
    let timeout = 0;
    if (!goToAnchor()) {
      observer = new MutationObserver(() => {
        if (goToAnchor()) observer?.disconnect();
      });
      const rootNode = document.getElementById("root");
      if (rootNode)
        observer.observe(rootNode, { childList: true, subtree: true });
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ["class"],
      });
      timeout = window.setTimeout(() => observer?.disconnect(), 5000);
    }
    return () => {
      observer?.disconnect();
      if (timeout) window.clearTimeout(timeout);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [location.pathname, location.hash, location.key, smoothScroll]);
  return (
    <div className="pf-shell" data-motion={enabled ? "running" : "static"}>
      <a className="pf-skip-link" href="#main-content">
        跳到主要内容
      </a>
      <Suspense fallback={<div className="tech-scene" aria-hidden="true" />}>
        <TechScene />
      </Suspense>
      <Outlet />
    </div>
  );
}

export default function PublicLayout() {
  return (
    <SceneMotionProvider>
      <PublicFrame />
    </SceneMotionProvider>
  );
}
