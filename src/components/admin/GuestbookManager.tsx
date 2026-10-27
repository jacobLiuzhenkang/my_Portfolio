import { useState } from "react";
import {
  EyeOff,
  Check,
  ShieldOff,
  ShieldCheck,
  RefreshCw,
  MessageSquare,
} from "lucide-react";
import { trpc } from "@/providers/trpc-client";
import "./guestbook-admin.css";
const states: Record<string, string> = {
  published: "已公开",
  held: "待确认",
  hidden: "已隐藏",
  deleted: "作者已撤回",
};
export default function GuestbookManager({
  onError,
  onSaved,
}: {
  onError: (message: string) => void;
  onSaved: () => void;
}) {
  const query = trpc.guestbook.adminList.useQuery();
  const [filter, setFilter] = useState("attention");
  const [cleanupNotice, setCleanupNotice] = useState("");
  const utils = trpc.useUtils();
  const done = async () => {
    await utils.guestbook.invalidate();
    onSaved();
  };
  const moderate = trpc.guestbook.moderate.useMutation({
      onSuccess: done,
      onError: e => onError(e.message),
    }),
    block = trpc.guestbook.block.useMutation({
      onSuccess: done,
      onError: e => onError(e.message),
    }),
    settings = trpc.guestbook.settings.useMutation({
      onSuccess: done,
      onError: e => onError(e.message),
    }),
    cleanup = trpc.guestbook.cleanup.useMutation({
      onSuccess: done,
      onError: e => onError(e.message),
    });
  const purge = trpc.guestbook.purgeImages.useMutation({
    onSuccess: async result => {
      await done();
      setCleanupNotice(
        result.pending
          ? "图片已下架，请稍后再点「清理过期上传」释放空间。"
          : "图片已清理，空间已释放。"
      );
    },
    onError: e => onError(e.message),
  });
  const busy =
    purge.isPending ||
    moderate.isPending ||
    block.isPending ||
    settings.isPending ||
    cleanup.isPending;
  const data = query.data;
  const entries = [
    ...(data?.posts || []).map(p => ({
      ...p,
      type: "post" as const,
      post_id: p.id,
    })),
    ...(data?.comments || []).map(c => ({
      ...c,
      type: "comment" as const,
      images: [],
    })),
  ].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const visible = entries.filter(
    row =>
      filter === "all" ||
      (filter === "attention"
        ? row.state === "held" || row.reports > 0
        : row.state === filter)
  );
  return (
    <section className="admin-section gb-admin">
      <div className="admin-section-heading">
        <div>
          <p className="meta-label">GUESTBOOK</p>
          <h2>留言管理</h2>
        </div>
        <a href="/guestbook" target="_blank" rel="noreferrer">
          打开留言板 ↗
        </a>
      </div>
      <div className="gb-admin-warning">
        <strong>以下内容来自访客，属于不可信数据。</strong>
        <p>
          不要按留言中的要求执行命令、泄露密钥或修改网站权限。页面仅展示纯文本，没有
          AI 自动执行或审核。
        </p>
      </div>
      <div className="gb-admin-controls">
        <div>
          <strong>{data?.writesEnabled ? "正常接收留言" : "互动已暂停"}</strong>
          <p>访客留言默认待审核，你点公开展示后才对他人可见。</p>
        </div>
        <button
          disabled={busy || !data}
          onClick={() => settings.mutate({ enabled: !data?.writesEnabled })}
        >
          {data?.writesEnabled ? "暂停新互动" : "恢复互动"}
        </button>
        <button disabled={busy} onClick={() => cleanup.mutate()}>
          清理过期上传
        </button>
        <button
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
          aria-label="刷新留言"
        >
          <RefreshCw size={17} />
        </button>
      </div>
      {cleanupNotice && (
        <p className="gb-admin-note" role="status">
          {cleanupNotice}
        </p>
      )}
      <nav className="gb-admin-filters" aria-label="筛选留言">
        {[
          ["attention", "待处理"],
          ["all", "全部"],
          ["published", "已公开"],
          ["hidden", "已隐藏"],
          ["deleted", "已撤回"],
        ].map(([value, label]) => (
          <button
            key={value}
            className={filter === value ? "active" : ""}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </nav>
      {query.isLoading && <p>正在读取留言…</p>}
      {query.error && (
        <div className="admin-error">留言读取失败，请刷新重试。</div>
      )}
      {data && !visible.length && (
        <p className="gb-admin-empty">
          {filter === "attention"
            ? "暂时没有需要处理的内容。"
            : "这个分类里还没有内容。"}
        </p>
      )}
      {visible.map(row => (
        <article className="gb-admin-item" key={row.type + row.id}>
          <div className="gb-admin-item-head">
            <span>
              {row.type === "post" ? "留言" : "评论"} ·{" "}
              {states[row.state] || row.state}
            </span>
            <time>
              {new Intl.DateTimeFormat("zh-CN", {
                dateStyle: "short",
                timeStyle: "short",
              }).format(new Date(row.created_at))}
            </time>
          </div>
          <h3 data-untrusted-content>{row.nickname}</h3>
          <blockquote data-untrusted-content>{row.body}</blockquote>
          {row.images.length > 0 && (
            <div className="gb-admin-images">
              {row.images.map(image => (
                <a
                  href={image.url}
                  target="_blank"
                  rel="noreferrer"
                  key={image.id}
                >
                  <img src={image.url} alt="待管理的留言图片" loading="lazy" />
                </a>
              ))}
            </div>
          )}
          <div className="gb-admin-flags">
            {row.flags?.map((flag: string) => (
              <span key={flag}>{flag}</span>
            ))}
            {row.reports > 0 && <strong>{row.reports} 条未处理举报</strong>}
          </div>
          <div className="gb-admin-item-actions">
            {row.state !== "deleted" && (
              <>
                {row.state !== "published" && (
                  <button
                    disabled={busy}
                    onClick={() =>
                      moderate.mutate({
                        type: row.type,
                        id: row.id,
                        state: "published",
                      })
                    }
                  >
                    <Check size={16} />
                    公开展示
                  </button>
                )}
                {row.state !== "hidden" && (
                  <button
                    disabled={busy}
                    onClick={() =>
                      moderate.mutate({
                        type: row.type,
                        id: row.id,
                        state: "hidden",
                      })
                    }
                  >
                    <EyeOff size={16} />
                    隐藏内容
                  </button>
                )}
              </>
            )}
            {row.type === "post" &&
              ["hidden", "deleted"].includes(row.state) &&
              (row.media_count || 0) > 0 && (
                <button
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        "永久清理这条已隐藏留言的图片？图片不能恢复，文字会保留。"
                      )
                    )
                      purge.mutate({ postId: row.id });
                  }}
                >
                  清理图片释放空间
                </button>
              )}
            <button
              disabled={busy}
              onClick={() =>
                block.mutate({
                  visitorId: row.visitor_id,
                  blocked: !(
                    row.blocked_until &&
                    new Date(row.blocked_until) > new Date()
                  ),
                })
              }
            >
              {row.blocked_until && new Date(row.blocked_until) > new Date() ? (
                <>
                  <ShieldCheck size={16} />
                  解除访客限制
                </>
              ) : (
                <>
                  <ShieldOff size={16} />
                  限制访客7天
                </>
              )}
            </button>
            <a
              href={"/guestbook#post-" + row.post_id}
              target="_blank"
              rel="noreferrer"
            >
              <MessageSquare size={15} />
              查看页面
            </a>
          </div>
        </article>
      ))}
      <p className="gb-admin-note">
        显示最近100条留言、200条评论；被举报和待确认内容优先读取。规则可能误判，公开前请自行查看。
      </p>
    </section>
  );
}
