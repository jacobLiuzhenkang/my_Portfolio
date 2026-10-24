import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { trpc } from "@/providers/trpc-client";
import { CheckField, Field, FormActions, linesToArray } from "./common";

type Experience = {
  id: number;
  company: string;
  role: string;
  period: string;
  summary: string;
  achievements: string[];
  sortOrder: number;
  published: boolean;
};
type FormState = Omit<Experience, "id" | "achievements"> & { achievementsText: string };
const blank: FormState = { company: "", role: "", period: "", summary: "", achievementsText: "", sortOrder: 10, published: true };

function ExperienceForm({ initial, id, onSaved, onError }: { initial: FormState; id?: number; onSaved: () => void; onError: (message: string) => void }) {
  const [form, setForm] = useState(initial);
  const utils = trpc.useUtils();
  const onSuccess = async () => { await utils.content.public.invalidate(); await utils.content.admin.invalidate(); onSaved(); };
  const create = trpc.content.createExperience.useMutation({ onSuccess, onError: (e) => onError(e.message) });
  const update = trpc.content.updateExperience.useMutation({ onSuccess, onError: (e) => onError(e.message) });
  const set = (key: keyof FormState) => (value: string) => setForm((old) => ({ ...old, [key]: value }));
  const pending = create.isPending || update.isPending;
  const data = { company: form.company, role: form.role, period: form.period, summary: form.summary, achievements: linesToArray(form.achievementsText), sortOrder: form.sortOrder, published: form.published };

  return <form className="admin-form" onSubmit={(e) => { e.preventDefault(); id ? update.mutate({ id, data }) : create.mutate(data); }}>
    <div className="form-grid two"><Field label="公司 / 组织" value={form.company} onChange={set("company")} required /><Field label="职位" value={form.role} onChange={set("role")} required /><Field label="时间" value={form.period} onChange={set("period")} placeholder="2024.08—2025.12 或 现任" required /><Field label="排序" value={String(form.sortOrder)} onChange={(v) => setForm((old) => ({ ...old, sortOrder: Number(v) || 0 }))} type="number" required /></div>
    <Field label="经历摘要" value={form.summary} onChange={set("summary")} textarea rows={3} required />
    <Field label="职责与成果" value={form.achievementsText} onChange={set("achievementsText")} textarea rows={9} hint="每行一条，公开页将显示为列表" required />
    <CheckField label="在公开简历中展示" checked={form.published} onChange={(published) => setForm((old) => ({ ...old, published }))} />
    <FormActions pending={pending} label={id ? "保存经历" : "新增经历"} />
  </form>;
}

export default function ExperienceManager({ experiences, onSaved, onError }: { experiences: Experience[]; onSaved: () => void; onError: (message: string) => void }) {
  const [selected, setSelected] = useState<number | "new">(experiences[0]?.id ?? "new");
  const utils = trpc.useUtils();
  const remove = trpc.content.deleteExperience.useMutation({ onSuccess: async () => { await utils.content.public.invalidate(); await utils.content.admin.invalidate(); setSelected("new"); onSaved(); }, onError: (e) => onError(e.message) });
  const current = experiences.find((item) => item.id === selected);
  const initial: FormState = current ? { company: current.company, role: current.role, period: current.period, summary: current.summary, achievementsText: current.achievements.join("\n"), sortOrder: current.sortOrder, published: current.published } : blank;

  return <section className="admin-section"><div className="admin-section-heading"><div><p className="meta-label">WORK HISTORY</p><h2>工作经历</h2></div><button className="admin-secondary" onClick={() => setSelected("new")}><Plus size={16} />新增经历</button></div>
    <div className="editor-layout"><div className="editor-list">{experiences.map((item) => <div className={selected === item.id ? "editor-list-item active" : "editor-list-item"} key={item.id}><button onClick={() => setSelected(item.id)}><strong>{item.company}</strong><span>{item.role} · {item.period}</span><small>{item.published ? "公开" : "已隐藏"} · 排序 {item.sortOrder}</small></button><button className="delete-button" aria-label={`删除 ${item.company}`} onClick={() => window.confirm(`确认删除「${item.company}」这段经历？`) && remove.mutate({ id: item.id })}><Trash2 size={15} /></button></div>)}</div>
      <div className="editor-panel"><h3>{current ? "编辑经历" : "新增经历"}</h3><ExperienceForm key={selected} initial={initial} id={current?.id} onSaved={onSaved} onError={onError} /></div>
    </div>
  </section>;
}
