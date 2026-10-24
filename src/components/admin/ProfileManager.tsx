import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { trpc } from "@/providers/trpc-client";
import { Field, FormActions, linesToArray } from "./common";

type Profile = {
  fullName: string;
  englishName: string;
  headline: string;
  role: string;
  company: string;
  location: string;
  email: string;
  phone: string | null;
  introduction: string;
  transitionStory: string;
  workingStyle: string;
  education: string;
  skills: string[];
  resumeFileKey: string | null;
};

export default function ProfileManager({ profile, onSaved, onError }: { profile: Profile; onSaved: () => void; onError: (message: string) => void }) {
  const [form, setForm] = useState({ ...profile, phone: profile.phone ?? "", skillsText: profile.skills.join("\n") });
  useEffect(() => setForm({ ...profile, phone: profile.phone ?? "", skillsText: profile.skills.join("\n") }), [profile]);
  const utils = trpc.useUtils();
  const mutation = trpc.content.updateProfile.useMutation({
    onSuccess: async () => { await utils.content.public.invalidate(); await utils.content.admin.invalidate(); onSaved(); },
    onError: (error) => onError(error.message),
  });
  const set = (key: keyof typeof form) => (value: string) => setForm((old) => ({ ...old, [key]: value }));

  return (
    <section className="admin-section">
      <div className="admin-section-heading"><div><p className="meta-label">RESUME PROFILE</p><h2>简历正文</h2></div><p>这里的内容会同步更新公开首页。PDF 文件在「文件」区域单独替换。</p></div>
      <form className="admin-form" onSubmit={(e) => { e.preventDefault(); mutation.mutate({
        fullName: form.fullName, englishName: form.englishName, headline: form.headline,
        role: form.role, company: form.company, location: form.location, email: form.email,
        phone: form.phone.trim() || null, introduction: form.introduction,
        transitionStory: form.transitionStory, workingStyle: form.workingStyle,
        education: form.education, skills: linesToArray(form.skillsText), resumeFileKey: form.resumeFileKey,
      }); }}>
        <div className="form-grid two">
          <Field label="姓名" value={form.fullName} onChange={set("fullName")} required />
          <Field label="英文名" value={form.englishName} onChange={set("englishName")} required />
          <Field label="当前职位" value={form.role} onChange={set("role")} required />
          <Field label="当前公司" value={form.company} onChange={set("company")} required />
          <Field label="所在城市" value={form.location} onChange={set("location")} required />
          <Field label="联系邮箱" value={form.email} onChange={set("email")} type="email" required />
          <Field label="联系电话" value={form.phone} onChange={set("phone")} hint="留空则公开页不显示" />
          <Field label="首屏标题" value={form.headline} onChange={set("headline")} required />
        </div>
        <Field label="职业概述" value={form.introduction} onChange={set("introduction")} textarea rows={4} required />
        <Field label="UI/UX → AI 产品工程师转型叙述" value={form.transitionStory} onChange={set("transitionStory")} textarea rows={7} required />
        <Field label="FDE 与工程协作方式" value={form.workingStyle} onChange={set("workingStyle")} textarea rows={5} required />
        <Field label="教育经历" value={form.education} onChange={set("education")} textarea rows={4} required />
        <Field label="Agent 能力矩阵" value={form.skillsText} onChange={set("skillsText")} textarea rows={16} hint="每行一项，使用「分类｜技能」分组；分类支持 Agent 协作、AI 产品、工程实现、AI 工作流" required />
        <div className="current-pdf"><FileText size={18} /><span>{form.resumeFileKey ? "当前已关联可下载的 PDF 简历" : "尚未关联 PDF，请在文件区域上传"}</span>{form.resumeFileKey && <a href="/api/resume/download?preview=1" target="_blank" rel="noreferrer">预览当前文件</a>}</div>
        <FormActions pending={mutation.isPending} />
      </form>
    </section>
  );
}
