import { createContext, useContext } from "react";

export const SceneMotionContext = createContext({
  enabled: true,
  systemReduced: false,
  toggle: () => {},
});
export const useSceneMotion = () => useContext(SceneMotionContext);
