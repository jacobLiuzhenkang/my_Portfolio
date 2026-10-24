import { useSyncExternalStore } from "react";
import { PHONE_QUERY } from "@contracts/phone-visual";
let media: MediaQueryList | undefined;
const getMedia = () => media ??= window.matchMedia(PHONE_QUERY);
const subscribe = (listener: () => void) => {
  const query = getMedia(); query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
};
export const usePhoneLayout = () => useSyncExternalStore(subscribe, () => getMedia().matches, () => false);
