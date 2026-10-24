import { useEffect, useState, type ReactNode } from "react";
import { SceneMotionContext } from "@/hooks/use-scene-motion";

const preferenceKey = "portfolio:pause-motion";

export function SceneMotionProvider({ children }: { children: ReactNode }) {
  const [paused, setPaused] = useState(() => {
    try {
      return localStorage.getItem(preferenceKey) === "true";
    } catch {
      return false;
    }
  });
  const [systemReduced, setSystemReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSystemReduced(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const toggle = () => {
    const next = !paused;
    setPaused(next);
    try {
      localStorage.setItem(preferenceKey, String(next));
    } catch {
      /* The current-tab preference still works. */
    }
  };
  return (
    <SceneMotionContext.Provider
      value={{ enabled: !paused && !systemReduced, systemReduced, toggle }}
    >
      {children}
    </SceneMotionContext.Provider>
  );
}
