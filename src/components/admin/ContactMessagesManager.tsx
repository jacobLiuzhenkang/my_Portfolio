import { useState } from "react";
import { trpc } from "@/providers/trpc-client";
import "../contact-form.css";
const labels = { new: "未读", read: "已读", spam: "垃圾" } as const;
export default function ContactMessagesManager() {
  const [pages, setPages] = useState<number[]>([]);
  const query = trpc.contact.list.useQuery({ before: pages.at(-1) });
  const utils = trpc.useUtils();
  const update = trpc.contact.setStatus.useMutation({
    onSuccess: () => utils.contact.list.invalidate(),
  });
  return (
    <section>
      <h1>联系留言</h1>
      <p>
        私信仅管理员可见。垃圾留言保留，可恢复为未读或已读；不提供公开、回复或删除功能。
      </p>
      {query.isLoading && <p role="status">正在读取留言…</p>}
      {query.error && (
        <p role="alert">
          读取失败，请确认已迁移数据库。
          <button onClick={() => query.refetch()}>重试</button>
        </p>
      )}
      {update.error && <p role="alert">状态更新失败，请重试。</p>}
      {query.data?.items.length === 0 && <p>暂无联系留言。</p>}
      {query.data?.items.map(m => (
        <article className="contact-message" key={m.id}>
          <h2>{m.name}</h2>
          <p>
            {m.email} · {m.company || "未填写公司"}
          </p>
          <p>
            <time dateTime={m.createdAt.toISOString()}>
              {m.createdAt.toLocaleString("zh-CN")}
            </time>{" "}
            · {labels[m.status]}
          </p>
          <p className="contact-message-body">{m.body}</p>
          {(["new", "read", "spam"] as const)
            .filter(s => s !== m.status)
            .map(s => (
              <button
                key={s}
                disabled={update.isPending}
                onClick={() => update.mutate({ id: m.id, status: s })}
              >
                标{labels[s]}
              </button>
            ))}
        </article>
      ))}
      <button
        disabled={!pages.length || query.isFetching}
        onClick={() => setPages(p => p.slice(0, -1))}
      >
        上一页
      </button>
      <button
        disabled={!query.data?.next || query.isFetching}
        onClick={() => {
          if (query.data?.next) setPages(p => [...p, query.data.next!]);
        }}
      >
        下一页
      </button>
    </section>
  );
}
