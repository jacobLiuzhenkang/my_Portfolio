import { useRef, useState } from "react";
import { Heart, MessageCircle, Flag, Undo2, ChevronDown } from "lucide-react";
import { trpc } from "@/providers/trpc-client";
import type { BoardPost, BoardImage } from "@contracts/guestbook";

const timeLabel = (time: string) =>
  new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(time));
type Actions = {
  ensure: () => Promise<void>;
  nickname: string;
  onNickname: (name: string) => void;
  notify: (text: string) => void;
  refresh: () => Promise<void>;
  ownerName?: string;
  enabled: boolean;
};
export function ContentTools({
  type,
  id,
  mine,
  actions,
}: {
  type: "post" | "comment";
  id: string;
  mine: boolean;
  actions: Actions;
}) {
  const [reporting, setReporting] = useState(false);
  const [busy, setBusy] = useState(false);
  const report = trpc.guestbook.report.useMutation(),
    remove = trpc.guestbook.remove.useMutation();
  const act = async (reason?: "abuse" | "spam" | "instructions" | "other") => {
    if (busy) return;
    setBusy(true);
    try {
      await actions.ensure();
      if (reason) {
        await report.mutateAsync({ type, id, reason });
        actions.notify("举报已收到，站长会查看处理。");
        setReporting(false);
      } else {
        await remove.mutateAsync({ type, id });
        await actions.refresh();
        actions.notify("已撤回。");
      }
    } catch (e) {
      actions.notify(e instanceof Error ? e.message : "操作失败，请重试。");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="gb-content-tools">
      {mine ? (
        <button
          disabled={busy}
          onClick={() => {
            if (window.confirm("撤回后，这条内容将不再公开展示。确定撤回？"))
              void act();
          }}
          aria-label={type === "post" ? "撤回留言" : "撤回评论"}
        >
          <Undo2 size={14} />
          <span>撤回</span>
        </button>
      ) : (
        <button
          disabled={busy}
          onClick={() => setReporting(v => !v)}
          aria-expanded={reporting}
          aria-label={type === "post" ? "举报留言" : "举报评论"}
        >
          <Flag size={14} />
          <span>举报</span>
        </button>
      )}
      {reporting && (
        <div className="gb-report-options" aria-label="举报原因">
          {(
            [
              ["abuse", "辱骂或骚扰"],
              ["spam", "垃圾推广"],
              ["instructions", "可疑指令"],
              ["other", "其他问题"],
            ] as const
          ).map(([reason, label]) => (
            <button
              key={reason}
              disabled={busy}
              onClick={() => void act(reason)}
            >
              {label}
            </button>
          ))}
          <button onClick={() => setReporting(false)}>取消</button>
        </div>
      )}
    </div>
  );
}
function Comments({ post, actions }: { post: BoardPost; actions: Actions }) {
  const [body, setBody] = useState("");
  const trap = useRef<HTMLInputElement>(null);
  const id = useRef(crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const query = trpc.guestbook.comments.useInfiniteQuery(
    { postId: post.id },
    { getNextPageParam: last => last.nextCursor }
  );
  const mutation = trpc.guestbook.comment.useMutation();
  const refresh = async () => {
    await query.refetch();
    await actions.refresh();
  };
  const submit = async () => {
    if (busy) return;
    if (!(actions.ownerName || actions.nickname).trim()) {
      actions.notify("评论前先填一下昵称。");
      return;
    }
    if (!body.trim()) return;
    setBusy(true);
    try {
      await actions.ensure();
      const result = await mutation.mutateAsync({
        id: id.current,
        postId: post.id,
        nickname: actions.ownerName || actions.nickname.trim(),
        body: body.trim(),
        website: trap.current?.value || "",
      });
      id.current = crypto.randomUUID();
      setBody("");
      await refresh();
      if (result.state === "held")
        actions.notify("已提交，通过站长审核后才会公开。");
    } catch (e) {
      actions.notify(e instanceof Error ? e.message : "评论失败，内容已保留。");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="gb-comments" aria-label="留言评论">
      {query.isLoading && <p className="gb-muted">正在读取评论…</p>}
      {query.error && (
        <button onClick={() => void query.refetch()}>
          评论暂时无法读取，点击重试
        </button>
      )}
      {query.data?.pages
        .flatMap(p => p.items)
        .map(comment => (
          <div className="gb-comment" key={comment.id}>
            <div className="gb-comment-heading">
              <strong data-untrusted-content>{comment.nickname}</strong>
              {comment.owner && <span className="gb-owner">站长</span>}
              <time dateTime={comment.createdAt}>
                {timeLabel(comment.createdAt)}
              </time>
            </div>
            <p className="gb-body" data-untrusted-content>
              {comment.body}
            </p>
            {comment.state === "held" && (
              <small className="gb-held">待站长确认，仅自己可见</small>
            )}
            <ContentTools
              type="comment"
              id={comment.id}
              mine={comment.mine}
              actions={{ ...actions, refresh }}
            />
          </div>
        ))}
      {query.hasNextPage && (
        <button
          className="gb-more-comments"
          onClick={() => void query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
        >
          展开更多评论
        </button>
      )}
      <form
        onSubmit={e => {
          e.preventDefault();
          void submit();
        }}
        className="gb-comment-form"
      >
        <label className="sr-only" htmlFor={"comment-name-" + post.id}>
          评论昵称
        </label>
        <input
          id={"comment-name-" + post.id}
          value={actions.ownerName || actions.nickname}
          onChange={e => actions.onNickname(e.target.value)}
          maxLength={32}
          placeholder="你的昵称"
          aria-label="评论昵称"
          disabled={!!actions.ownerName || busy}
          required
        />
        <label className="sr-only" htmlFor={"comment-body-" + post.id}>
          评论内容
        </label>
        <textarea
          id={"comment-body-" + post.id}
          rows={2}
          value={body}
          onChange={e => setBody(e.target.value)}
          maxLength={500}
          placeholder={"回复 " + post.nickname + "…"}
          disabled={busy || !actions.enabled}
          required
        />
        <label className="gb-trap" aria-hidden="true">
          个人网站
          <input ref={trap} name="website" autoComplete="off" tabIndex={-1} />
        </label>
        <button type="submit" disabled={busy || !actions.enabled}>
          {busy ? "发送中…" : "发送评论"}
        </button>
      </form>
    </section>
  );
}
export default function PostCard({
  post,
  actions,
  onPhoto,
}: {
  post: BoardPost;
  actions: Actions;
  onPhoto: (images: BoardImage[], index: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const like = trpc.guestbook.setLike.useMutation();
  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await actions.ensure();
      await like.mutateAsync({ id: post.id, liked: !post.liked });
      await actions.refresh();
    } catch (e) {
      actions.notify(e instanceof Error ? e.message : "点赞失败，请稍后重试。");
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className="gb-post" id={"post-" + post.id}>
      <div className="gb-post-heading">
        <span
          className={"gb-avatar" + (post.owner ? " is-owner" : "")}
          aria-hidden="true"
        >
          {post.owner ? "LZ" : Array.from(post.nickname)[0]}
        </span>
        <div className="gb-author">
          <div>
            <strong data-untrusted-content>{post.nickname}</strong>
            {post.owner && <span className="gb-owner">站长</span>}
          </div>
          <time dateTime={post.createdAt}>{timeLabel(post.createdAt)}</time>
        </div>
        <ContentTools
          type="post"
          id={post.id}
          mine={post.mine}
          actions={actions}
        />
      </div>
      {post.state === "held" && (
        <p className="gb-held">待站长确认，仅自己可见</p>
      )}
      {post.body && (
        <p className="gb-body gb-post-body" data-untrusted-content>
          {post.body}
        </p>
      )}
      {!!post.images.length && (
        <div
          className={"gb-photos gb-photos-" + Math.min(post.images.length, 3)}
        >
          {post.images.map((photo, index) => (
            <button
              key={photo.id}
              onClick={() => onPhoto(post.images, index)}
              aria-label={"查看留言图片 " + (index + 1)}
            >
              <img
                src={photo.url}
                width={photo.width}
                height={photo.height}
                alt={"留言图片 " + (index + 1)}
                loading="lazy"
                decoding="async"
                onError={e => {
                  e.currentTarget.alt = "图片暂时不可用";
                }}
              />
            </button>
          ))}
        </div>
      )}
      <div className="gb-post-actions">
        <button
          onClick={() => void toggle()}
          disabled={busy || !actions.enabled}
          aria-pressed={post.liked}
          aria-label={post.liked ? "取消点赞" : "点赞留言"}
          className={post.liked ? "is-liked" : ""}
        >
          <Heart size={19} fill={post.liked ? "currentColor" : "none"} />
          <span>点赞{post.likes > 0 ? " · " + post.likes : ""}</span>
        </button>
        <button onClick={() => setExpanded(v => !v)} aria-expanded={expanded}>
          <MessageCircle size={19} />
          <span>评论{post.comments > 0 ? " · " + post.comments : ""}</span>
          <ChevronDown size={14} className={expanded ? "is-expanded" : ""} />
        </button>
      </div>
      {expanded && <Comments post={post} actions={actions} />}
    </article>
  );
}
