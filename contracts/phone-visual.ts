export const PHONE_QUERY = "(max-width: 760px), (pointer: coarse) and (max-width: 960px) and (max-height: 500px)";
export function splitPhoneHeadline(headline: string) {
  const index = headline.indexOf("，");
  if (index < 0) return { lead: "", emphasis: headline };
  let lead = headline.slice(0, index + 1), emphasis = headline.slice(index + 1);
  if (emphasis.startsWith("做成")) { lead += "做成"; emphasis = emphasis.slice(2); }
  return { lead, emphasis };
}
export type PhoneQuality = { value: number; slow: number; stable: number };
export function advancePhoneQuality(current: PhoneQuality, fps: number): PhoneQuality {
  if (!Number.isFinite(fps) || fps <= 0) return current;
  if (fps < 24) {
    const slow = current.slow + 1;
    return slow >= 2 ? { value: Math.max(.8, Math.round((current.value - .1) * 100) / 100), slow: 0, stable: 0 } : { ...current, slow, stable: 0 };
  }
  if (fps >= 28) {
    const stable = current.stable + 1;
    return stable >= 4 ? { value: Math.min(1, Math.round((current.value + .05) * 100) / 100), slow: 0, stable: 0 } : { ...current, slow: 0, stable };
  }
  return { ...current, slow: 0, stable: 0 };
}
