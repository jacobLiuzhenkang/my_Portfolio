import { lazy, Suspense, useRef, useState } from "react";
import { ImagePlus, Plus, Trash2 } from "lucide-react";
import { trpc } from "@/providers/trpc-client";
import { useFileUpload } from "@/hooks/use-file-upload";
import {
  CheckField,
  commasToArray,
  Field,
  FormActions,
  linesToArray,
} from "./common";

const CaseStudy = lazy(() => import("../CaseStudy"));

type Project = {
  id: number;
  title: string;
  subtitle: string;
  category: string;
  description: string;
  content: string;
  tags: string[];
  coverImage: string | null;
  coverKey: string | null;
  coverUrl: string | null;
  gallery: string[];
  demoUrl: string | null;
  featured: boolean;
  published: boolean;
  sortOrder: number;
};
type FormState = {
  title: string;
  subtitle: string;
  category: string;
  description: string;
  content: string;
  tagsText: string;
  coverImage: string;
  coverKey: string | null;
  galleryText: string;
  demoUrl: string;
  featured: boolean;
  published: boolean;
  sortOrder: number;
};
const blank: FormState = {
  title: "",
  subtitle: "",
  category: "AI 产品",
  description: "",
  content: "",
  tagsText: "",
  coverImage: "",
  coverKey: null,
  galleryText: "",
  demoUrl: "",
  featured: false,
  published: true,
  sortOrder: 10,
};

function ProjectForm({
  initial,
  id,
  coverUrl,
  onSaved,
  onError,
}: {
  initial: FormState;
  id?: number;
  coverUrl: string | null;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const [form, setForm] = useState(initial);
  const [uploadHint, setUploadHint] = useState("");
  const contentField = useRef<HTMLTextAreaElement>(null);
  const [inlineImage, setInlineImage] = useState("");
  const [previewCase, setPreviewCase] = useState(false);
  const utils = trpc.useUtils();
  const onSuccess = async () => {
    await utils.content.public.invalidate();
    await utils.content.admin.invalidate();
    onSaved();
  };
  const create = trpc.content.createProject.useMutation({
    onSuccess,
    onError: e => onError(e.message),
  });
  const update = trpc.content.updateProject.useMutation({
    onSuccess,
    onError: e => onError(e.message),
  });
  const upload = useFileUpload({
    onSuccess: result => {
      setForm(old => ({ ...old, coverKey: result.key, coverImage: "" }));
      setUploadHint("新封面已上传，点击保存作品后生效。");
    },
    onError: e => onError(e.message),
  });
  const set = (key: keyof FormState) => (value: string) =>
    setForm(old => ({ ...old, [key]: value }));
  const pending = create.isPending || update.isPending || upload.isPending;
  const data = {
    title: form.title,
    subtitle: form.subtitle,
    category: form.category,
    description: form.description,
    content: form.content,
    tags: commasToArray(form.tagsText),
    coverImage: form.coverImage.trim() || null,
    coverKey: form.coverKey,
    gallery: linesToArray(form.galleryText),
    demoUrl: form.demoUrl.trim() || null,
    featured: form.featured,
    published: form.published,
    sortOrder: form.sortOrder,
  };

  return (
    <form
      className="admin-form"
      onSubmit={e => {
        e.preventDefault();
        if (id) update.mutate({ id, data });
        else create.mutate(data);
      }}
    >
      <div className="cover-editor">
        <div className="cover-preview">
          {form.coverKey && uploadHint ? (
            <span>新封面已上传，保存后生效</span>
          ) : coverUrl ? (
            <img src={coverUrl} alt="当前封面" />
          ) : (
            <span>暂无封面</span>
          )}
        </div>
        <label className="admin-secondary upload-button">
          <ImagePlus size={16} />
          {upload.isPending ? "正在上传…" : "上传新封面"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={upload.isPending}
            onChange={async e => {
              const file = e.target.files?.[0];
              if (!file) return;
              setUploadHint("");
              upload.mutate({ file, purpose: "project" });
              e.target.value = "";
            }}
          />
        </label>
        <small>支持 JPG、PNG、WebP、GIF，最大 25 MB。</small>
        {uploadHint && <p className="inline-success">{uploadHint}</p>}
      </div>
      <div className="form-grid two">
        <Field
          label="项目名称"
          value={form.title}
          onChange={set("title")}
          required
        />
        <Field
          label="副标题"
          value={form.subtitle}
          onChange={set("subtitle")}
          required
        />
        <Field
          label="分类"
          value={form.category}
          onChange={set("category")}
          required
        />
        <Field
          label="排序"
          value={String(form.sortOrder)}
          onChange={v =>
            setForm(old => ({ ...old, sortOrder: Number(v) || 0 }))
          }
          type="number"
          required
        />
        <Field
          label="标签"
          value={form.tagsText}
          onChange={set("tagsText")}
          hint="用逗号分隔"
        />
        <Field
          label="项目访问地址"
          value={form.demoUrl}
          onChange={set("demoUrl")}
          placeholder="https://"
        />
      </div>
      <Field
        label="项目简介"
        value={form.description}
        onChange={set("description")}
        textarea
        rows={3}
        required
      />
      <label className="admin-field">
        <span>
          案例正文（支持图文混排）<b> *</b>
        </span>
        <textarea
          ref={contentField}
          value={form.content}
          onChange={event =>
            setForm(old => ({ ...old, content: event.target.value }))
          }
          rows={16}
          required
        />
        <small>
          标题用
          ###，图片标记放在对应文字之后。可从下方选择图集图片，插入当前光标位置。
        </small>
      </label>
      <div className="case-editor-tools">
        <select
          value={inlineImage}
          onChange={event => setInlineImage(event.target.value)}
          aria-label="选择图集图片"
        >
          <option value="">选择一张图集图片</option>
          {linesToArray(form.galleryText).map((src, index) => (
            <option key={src} value={src}>
              {"图片 " + (index + 1) + " · " + src.split("/").at(-1)}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="admin-secondary"
          disabled={!inlineImage}
          onClick={() => {
            const start =
                contentField.current?.selectionStart ?? form.content.length,
              end = contentField.current?.selectionEnd ?? start;
            const source = inlineImage
              .replace(/\(/g, "%28")
              .replace(/\)/g, "%29")
              .replace(/ /g, "%20");
            const image = "\n\n![图片说明](" + source + ")\n\n";
            setForm(old => ({
              ...old,
              content:
                old.content.slice(0, start) + image + old.content.slice(end),
            }));
            requestAnimationFrame(() => {
              contentField.current?.focus();
              contentField.current?.setSelectionRange(start + 4, start + 8);
            });
          }}
        >
          插入图片
        </button>
        <button
          type="button"
          className="admin-secondary"
          onClick={() => setPreviewCase(value => !value)}
        >
          {previewCase ? "收起预览" : "预览图文排版"}
        </button>
      </div>
      {previewCase && (
        <div className="case-editor-preview">
          <Suspense fallback={<p>正在生成预览…</p>}>
            <CaseStudy
              content={form.content}
              gallery={linesToArray(form.galleryText)}
              title={form.title}
            />
          </Suspense>
        </div>
      )}
      <Field
        label="图集图片"
        value={form.galleryText}
        onChange={set("galleryText")}
        textarea
        rows={5}
        hint="每行一个，例如 /images/memoring/1.webp"
      />
      <Field
        label="封面图片地址"
        value={form.coverImage}
        onChange={set("coverImage")}
        hint="使用上传封面后可留空；现有本地素材可填 /images/…"
      />
      <div className="form-grid two">
        <CheckField
          label="设为精选大图的排版"
          checked={form.featured}
          onChange={featured => setForm(old => ({ ...old, featured }))}
        />
        <CheckField
          label="在公开页面展示"
          checked={form.published}
          onChange={published => setForm(old => ({ ...old, published }))}
        />
      </div>
      <FormActions pending={pending} label={id ? "保存作品" : "新增作品"} />
    </form>
  );
}

export default function ProjectManager({
  projects,
  onSaved,
  onError,
}: {
  projects: Project[];
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const [selected, setSelected] = useState<number | "new">(
    projects[0]?.id ?? "new"
  );
  const utils = trpc.useUtils();
  const remove = trpc.content.deleteProject.useMutation({
    onSuccess: async () => {
      await utils.content.public.invalidate();
      await utils.content.admin.invalidate();
      setSelected("new");
      onSaved();
    },
    onError: e => onError(e.message),
  });
  const current = projects.find(item => item.id === selected);
  const initial: FormState = current
    ? {
        title: current.title,
        subtitle: current.subtitle,
        category: current.category,
        description: current.description,
        content: current.content,
        tagsText: current.tags.join(", "),
        coverImage: current.coverImage ?? "",
        coverKey: current.coverKey,
        galleryText: current.gallery.join("\n"),
        demoUrl: current.demoUrl ?? "",
        featured: current.featured,
        published: current.published,
        sortOrder: current.sortOrder,
      }
    : blank;

  return (
    <section className="admin-section">
      <div className="admin-section-heading">
        <div>
          <p className="meta-label">PORTFOLIO</p>
          <h2>作品管理</h2>
        </div>
        <button className="admin-secondary" onClick={() => setSelected("new")}>
          <Plus size={16} />
          新增作品
        </button>
      </div>
      <div className="editor-layout">
        <div className="editor-list">
          {projects.map(item => (
            <div
              className={
                selected === item.id
                  ? "editor-list-item active"
                  : "editor-list-item"
              }
              key={item.id}
            >
              <button onClick={() => setSelected(item.id)}>
                <strong>{item.title}</strong>
                <span>
                  {item.category} · {item.subtitle}
                </span>
                <small>
                  {item.published ? "公开" : "已隐藏"}
                  {item.featured ? " · 精选" : ""} · 排序 {item.sortOrder}
                </small>
              </button>
              <button
                className="delete-button"
                aria-label={`删除 ${item.title}`}
                onClick={() =>
                  window.confirm(`确认删除「${item.title}」？`) &&
                  remove.mutate({ id: item.id })
                }
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
        <div className="editor-panel">
          <h3>{current ? "编辑作品" : "新增作品"}</h3>
          <ProjectForm
            key={selected}
            initial={initial}
            id={current?.id}
            coverUrl={current?.coverUrl ?? null}
            onSaved={onSaved}
            onError={onError}
          />
        </div>
      </div>
    </section>
  );
}
