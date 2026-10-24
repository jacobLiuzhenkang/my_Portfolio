import { useState } from "react";
import { Download, FileText, Trash2, Upload } from "lucide-react";
import { trpc } from "@/providers/trpc-client";
import { useFileUpload } from "@/hooks/use-file-upload";

function sizeLabel(size: number) {
  return size > 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(size / 1024)} KB`;
}

export default function FileManager({ onSaved, onError }: { onSaved: () => void; onError: (message: string) => void }) {
  const [purpose, setPurpose] = useState<"resume" | "file">("resume");
  const utils = trpc.useUtils();
  const files = trpc.storage.list.useQuery();
  const upload = useFileUpload({
    onSuccess: async (_data, variables) => {
      await utils.storage.list.invalidate();
      if (variables.purpose === "resume") { await utils.content.public.invalidate(); await utils.content.admin.invalidate(); }
      onSaved();
    },
    onError: (e) => onError(e.message),
  });
  const remove = trpc.storage.remove.useMutation({ onSuccess: async () => { await utils.storage.list.invalidate(); onSaved(); }, onError: (e) => onError(e.message) });

  return <section className="admin-section"><div className="admin-section-heading"><div><p className="meta-label">OBJECT STORAGE</p><h2>文件与 PDF</h2></div><p>管理项目图片、普通附件和可下载的 PDF 简历。</p></div>
    <div className="upload-zone"><div><h3>上传新文件</h3><p>选择「替换简历 PDF」后，公开页的下载按钮会立即指向新文件。</p></div><div className="upload-controls"><select value={purpose} onChange={(e) => setPurpose(e.target.value as "resume" | "file")} aria-label="文件用途"><option value="resume">替换简历 PDF</option><option value="file">普通附件</option></select><label className="admin-primary upload-button"><Upload size={16} />{upload.isPending ? "正在上传…" : "选择文件"}<input type="file" accept={purpose === "resume" ? "application/pdf" : "image/jpeg,image/png,image/webp,image/gif,application/pdf"} disabled={upload.isPending} onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; if (purpose === "resume" && file.type !== "application/pdf") { onError("简历附件必须是 PDF"); return; } upload.mutate({ file, purpose }); e.target.value = ""; }} /></label></div></div>
    <div className="file-list">{files.isLoading && <p>正在读取文件…</p>}{files.data?.length === 0 && <p>暂无上传文件。</p>}{files.data?.map((file) => <div className="file-row" key={file.key}><FileText size={20} /><div><strong>{file.name}</strong><span>{file.contentType} · {sizeLabel(file.size)}</span></div><a href={file.url} target="_blank" rel="noreferrer" aria-label={`打开 ${file.name}`}><Download size={17} /></a><button className="delete-button" disabled={!file.canDelete} title={!file.canDelete ? "请在文件所属环境删除" : undefined} aria-label={`删除 ${file.name}`} onClick={() => window.confirm(`确认删除「${file.name}」？正在使用的文件无法删除。`) && remove.mutate({ key: file.key })}><Trash2 size={16} /></button></div>)}</div>
  </section>;
}
