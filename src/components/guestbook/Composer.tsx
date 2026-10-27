import { useEffect, useRef, useState } from "react";
import { ImagePlus, Send, X } from "lucide-react";
import { trpc } from "@/providers/trpc-client";
import {
  IMAGE_MAX_BYTES,
  IMAGE_TYPES,
  POST_MAX_BYTES,
} from "@contracts/guestbook";

type Photo = { id: string; file: Blob; preview: string };
async function compressPhoto(file: File) {
  if (
    !IMAGE_TYPES.includes(file.type as (typeof IMAGE_TYPES)[number]) ||
    file.size > 20 * 1024 * 1024
  )
    throw new Error("请选择20 MB以内的 JPG、PNG 或 WebP 图片。");
  const image = await createImageBitmap(file);
  try {
    if (image.width * image.height > 40_000_000)
      throw new Error("图片尺寸过大，请缩小后再选择。");
    const scale = Math.min(1, 1920 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("浏览器暂时无法处理图片。");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.82, 0.62]) {
      const blob = await new Promise<Blob | null>(resolve =>
        canvas.toBlob(resolve, "image/webp", quality)
      );
      if (
        blob &&
        blob.size <= IMAGE_MAX_BYTES &&
        IMAGE_TYPES.includes(blob.type as (typeof IMAGE_TYPES)[number])
      )
        return blob;
    }
    throw new Error("压缩后图片仍超过2 MB，请换一张较小的图片。");
  } finally {
    image.close();
  }
}
export default function Composer({
  ensure,
  nickname,
  onNickname,
  onDone,
  notify,
  ownerName,
  enabled,
}: {
  ensure: () => Promise<void>;
  nickname: string;
  onNickname: (name: string) => void;
  onDone: () => Promise<void>;
  notify: (text: string) => void;
  ownerName?: string;
  enabled: boolean;
}) {
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const trap = useRef<HTMLInputElement>(null);
  const urls = useRef(new Set<string>());
  const transferred = useRef(
    new Map<
      string,
      { id: string; url: string; uploaded: boolean; ready: boolean }
    >()
  );
  const draftId = useRef(crypto.randomUUID());
  const prepare = trpc.guestbook.prepareImage.useMutation(),
    finalize = trpc.guestbook.finalizeImage.useMutation(),
    create = trpc.guestbook.createPost.useMutation();
  useEffect(() => {
    const previews = urls.current;
    return () => {
      previews.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);
  const pick = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const incoming = [...files];
      if (photos.length + incoming.length > 9)
        throw new Error("每条留言最多9张图片。");
      const next: Photo[] = [];
      try {
        for (const file of incoming) {
          const blob = await compressPhoto(file);
          const preview = URL.createObjectURL(blob);
          urls.current.add(preview);
          next.push({ id: crypto.randomUUID(), file: blob, preview });
        }
        if (
          [...photos, ...next].reduce((n, p) => n + p.file.size, 0) >
          POST_MAX_BYTES
        )
          throw new Error("图片合计不能超过12 MB，请少选几张。");
        setPhotos(old => [...old, ...next]);
      } catch (error) {
        next.forEach(p => {
          URL.revokeObjectURL(p.preview);
          urls.current.delete(p.preview);
        });
        throw error;
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : "图片选择失败，请重试。");
    } finally {
      setBusy(false);
    }
  };
  const remove = (id: string) => {
    const photo = photos.find(p => p.id === id);
    if (photo) {
      URL.revokeObjectURL(photo.preview);
      urls.current.delete(photo.preview);
    }
    transferred.current.delete(id);
    setPhotos(old => old.filter(p => p.id !== id));
  };
  const submit = async () => {
    if (busy) return;
    if (!(ownerName || nickname).trim()) {
      notify("先填一个让朋友认得你的昵称吧。");
      return;
    }
    if (!body.trim() && !photos.length) {
      notify("写句话，或者添加一张图片。");
      return;
    }
    setBusy(true);
    try {
      if (trap.current?.value) throw new Error("本次提交未通过校验。");
      await ensure();
      const ids: string[] = [];
      for (let index = 0; index < photos.length; index++) {
        const photo = photos[index];
        setProgress("上传图片 " + (index + 1) + " / " + photos.length);
        let record = transferred.current.get(photo.id);
        if (!record) {
          const prepared = await prepare.mutateAsync({
            mime: photo.file.type as (typeof IMAGE_TYPES)[number],
            size: photo.file.size,
          });
          record = { ...prepared, uploaded: false, ready: false };
          transferred.current.set(photo.id, record);
        }
        if (!record.uploaded) {
          const response = await fetch(record.url, {
            method: "PUT",
            headers: { "Content-Type": photo.file.type },
            body: photo.file,
            credentials:
              new URL(record.url, location.href).origin === location.origin
                ? "same-origin"
                : "omit",
          });
          if (!response.ok) {
            try {
              await finalize.mutateAsync({ id: record.id });
              record.ready = true;
            } catch {
              transferred.current.delete(photo.id);
              throw new Error("图片上传中断，请再次点击发布重试。");
            }
          }
          record.uploaded = true;
        }
        if (!record.ready) {
          await finalize.mutateAsync({ id: record.id });
          record.ready = true;
        }
        ids.push(record.id);
      }
      setProgress("正在发布…");
      const result = await create.mutateAsync({
        id: draftId.current,
        nickname: ownerName || nickname.trim(),
        body: body.trim(),
        images: ids,
        website: trap.current?.value || "",
      });
      setBody("");
      photos.forEach(p => {
        URL.revokeObjectURL(p.preview);
        urls.current.delete(p.preview);
      });
      setPhotos([]);
      transferred.current.clear();
      draftId.current = crypto.randomUUID();
      await onDone();
      notify(
        result.state === "held"
          ? "已提交，通过站长审核后才会公开。"
          : "留言已发布，谢谢你来过。"
      );
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "发布失败，内容已保留，请重试。"
      );
    } finally {
      setBusy(false);
      setProgress("");
    }
  };
  return (
    <form
      className="gb-composer"
      onSubmit={e => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="gb-composer-heading">
        <span className="gb-avatar" aria-hidden="true">
          你
        </span>
        <div>
          <h2>留个脚印</h2>
          <p>一段近况，一张照片，或者一句问候。</p>
        </div>
      </div>
      <label className="gb-name-field">
        你的昵称
        <input
          value={ownerName || nickname}
          onChange={e => onNickname(e.target.value)}
          maxLength={32}
          placeholder="朋友怎么称呼你"
          required
          disabled={!!ownerName || busy}
          autoComplete="nickname"
        />
      </label>
      <label className="sr-only" htmlFor="guestbook-message">
        留言内容
      </label>
      <textarea
        id="guestbook-message"
        value={body}
        onChange={e => setBody(e.target.value)}
        maxLength={2000}
        placeholder="最近有什么想分享的？"
        rows={4}
        disabled={busy || !enabled}
      />
      <label className="gb-trap" aria-hidden="true">
        个人网站
        <input ref={trap} tabIndex={-1} name="website" autoComplete="off" />
      </label>
      {!!photos.length && (
        <div className="gb-draft-photos">
          {photos.map((p, i) => (
            <div key={p.id}>
              <img src={p.preview} alt={"待发布图片 " + (i + 1)} />
              <button
                type="button"
                onClick={() => remove(p.id)}
                disabled={busy}
                aria-label={"移除图片 " + (i + 1)}
              >
                <X size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="gb-compose-actions">
        <label className={"gb-pick" + (busy || !enabled ? " is-disabled" : "")}>
          <ImagePlus size={21} />
          <span>
            照片 <small>{photos.length}/9</small>
          </span>
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            disabled={busy || !enabled}
            onChange={e => {
              void pick(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        <button
          className="gb-publish"
          disabled={busy || !enabled}
          type="submit"
        >
          <Send size={17} />
          {busy ? progress || "处理图片…" : "发布留言"}
        </button>
      </div>
      <p className="gb-compose-note">
        {enabled
          ? "提交后需站长审核才会公开。请友善交流，保护自己和他人的隐私。"
          : "留言互动暂时休息中，已有内容仍可浏览。"}
      </p>
    </form>
  );
}
