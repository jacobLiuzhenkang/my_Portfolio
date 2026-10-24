import { lazy, Suspense } from "react";
import { usePhoneLayout } from "@/hooks/use-phone-layout";
import DesktopTechScene from "./DesktopTechScene";
const MobileTechScene = lazy(() => import("./mobile/MobileTechScene"));
/** Desktop code stays intact; each display profile owns its renderer and quality. */
export default function TechScene() {
  const phone = usePhoneLayout();
  return phone ? <Suspense fallback={<div className="tech-scene phone-sky-fallback" aria-hidden="true" />}><MobileTechScene /></Suspense> : <DesktopTechScene />;
}
