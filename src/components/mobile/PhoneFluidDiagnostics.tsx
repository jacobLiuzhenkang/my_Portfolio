import { useState } from "react";
import { PHONE_FLUID_VERSION, type PhoneFluidMode } from "./phone-fluid-shaders";
import "./phone-fluid-diagnostics.css";

const modes: { value: PhoneFluidMode; label: string }[] = [
  { value: "original", label: "A 原版" },
  { value: "powers", label: "B 安全乘方" },
  { value: "stable", label: "C 稳定噪声" },
];

// Owner-requested, opt-in device comparison. No collection or network upload.
export function PhoneFluidDiagnostics({ initialMode, onModeChange, readDiagnostics }: {
  initialMode: PhoneFluidMode;
  onModeChange: (mode: PhoneFluidMode) => void;
  readDiagnostics: () => Record<string, unknown>;
}) {
  const [mode, setMode] = useState(initialMode);
  const [report, setReport] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const select = (next: PhoneFluidMode) => {
    onModeChange(next);
    setMode(next);
    setReport("");
    setCopyStatus("");
  };
  const copy = async () => {
    const value = JSON.stringify(readDiagnostics(), null, 2);
    setReport(value);
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus("已复制，可粘贴到聊天");
    } catch {
      setCopyStatus("请长按下方文字复制");
    }
  };
  return <details className="phone-fluid-diagnostics" open>
    <summary>流体复测 {PHONE_FLUID_VERSION} · {modes.find(item => item.value === mode)?.label}</summary>
    <div className="phone-fluid-diagnostics__body">
      <p>切换后看背景是否还有大块断面。点击上方可收起。</p>
      <div className="phone-fluid-diagnostics__modes" role="group" aria-label="流体兼容模式">
        {modes.map(item => <button key={item.value} type="button" aria-pressed={mode === item.value} onClick={() => select(item.value)}>{item.label}</button>)}
      </div>
      <button type="button" onClick={copy}>复制诊断信息</button>
      <span role="status">{copyStatus}</span>
      {report && <textarea aria-label="本机流体诊断信息" readOnly value={report} rows={5} />}
      <small>仅在本机显示，点击复制后由你发送。</small>
    </div>
  </details>;
}
