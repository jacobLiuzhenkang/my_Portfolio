import type { ReactNode } from "react";

export function Field({ label, value, onChange, textarea = false, rows = 4, type = "text", required = false, placeholder, hint }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  textarea?: boolean;
  rows?: number;
  type?: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="admin-field">
      <span>{label}{required && <b> *</b>}</span>
      {textarea ? <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} required={required} placeholder={placeholder} /> : <input value={value} onChange={(e) => onChange(e.target.value)} type={type} required={required} placeholder={placeholder} />}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="check-field"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /><span>{label}</span></label>;
}

export function FormActions({ pending, children, label = "保存修改" }: { pending: boolean; children?: ReactNode; label?: string }) {
  return <div className="form-actions"><button className="admin-primary" type="submit" disabled={pending}>{pending ? "正在保存…" : label}</button>{children}</div>;
}

export function linesToArray(value: string) {
  return value.split("\n").map((item) => item.trim()).filter(Boolean);
}

export function commasToArray(value: string) {
  return value.split(/[,，]/).map((item) => item.trim()).filter(Boolean);
}

export async function fileToBase64(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}
