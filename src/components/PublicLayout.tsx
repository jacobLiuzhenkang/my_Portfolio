import { lazy, Suspense, useLayoutEffect } from "react";
import { Outlet, useLocation } from "react-router";
import { useSmoothScroll } from "@/motion";
import { SceneMotionProvider } from "./SceneMotion";
import { useSceneMotion } from "@/hooks/use-scene-motion";

const TechScene = lazy(() => import("./TechScene"));

/** The outlet changes; this layout and the background clock stay mounted. */
function PublicFrame() {
  const location = useLocation();
  const { enabled } = useSceneMotion();
  const smoothScroll = useSmoothScroll(enabled);
  useLayoutEffect(() => {
    document.title =
      location.pathname === "/guestbook"
        ? "留言板 — 刘振康"
        : location.pathname === "/growth"
          ? "我的成长 — 刘振康 · AI 产品工程师"
          : "刘振康 · AI 产品工程师";
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
    const goToAnchor = () => {
      const target = document.getElementById(id);
      if (!target) return false;
      if (smoothScroll.current) {
        smoothScroll.current.resize();
        smoothScroll.current.scrollTo(target, {
          immediate: true,
          offset:
            -(
              document.querySelector(".pf-header")?.getBoundingClientRect()
                .height ?? 0
            ) - 12,
        });
      } else
        window.scrollTo({
          top:
            window.scrollY +
            target.getBoundingClientRect().top -
            (document.querySelector(".pf-header")?.getBoundingClientRect()
              .height ?? 0) -
            12,
          behavior: "instant",
        });
      return true;
    };
    if (goToAnchor()) return;
    const observer = new MutationObserver(() => {
      if (goToAnchor()) observer.disconnect();
    });
    observer.observe(document.getElementById("root")!, {
      childList: true,
      subtree: true,
    });
    const timeout = window.setTimeout(() => observer.disconnect(), 5000);
    return () => {
      observer.disconnect();
      window.clearTimeout(timeout);
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
