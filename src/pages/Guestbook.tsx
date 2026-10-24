import { useCallback, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { PortfolioHeader, PortfolioFooter } from "@/components/PortfolioUI";
import Composer from "@/components/guestbook/Composer";
import PostCard from "@/components/guestbook/PostCard";
import PhotoViewer from "@/components/guestbook/PhotoViewer";
import { trpc } from "@/providers/trpc-client";
import type { BoardImage } from "@contracts/guestbook";
import "@/guestbook.css";
export default function Guestbook() {
  const profile = trpc.content.public.useQuery();
  const status = trpc.guestbook.status.useQuery();
  const feed = trpc.guestbook.feed.useInfiniteQuery(
    {},
    { getNextPageParam: last => last.nextCursor }
  );
  const identity = trpc.guestbook.identity.useMutation();
  const [nickname, setNickname] = useState(() => {
    try {
      return localStorage.getItem("lz-guest-nickname") || "";
    } catch {
      return "";
    }
  });
  const [notice, setNotice] = useState("");
  const [viewer, setViewer] = useState<{
    images: BoardImage[];
    index: number;
  } | null>(null);
  const identityPending = useRef<Promise<void> | null>(null);
  const notify = useCallback((text: string) => setNotice(text), []);
  const remember = (value: string) => {
    setNickname(value);
    try {
      localStorage.setItem("lz-guest-nickname", value);
    } catch {
      /* Current-page input still works. */
    }
  };
  const ensure = async () => {
    if (!identityPending.current)
      identityPending.current = identity
        .mutateAsync({ website: "" })
        .then(() => {})
        .finally(() => {
          identityPending.current = null;
        });
    await identityPending.current;
  };
  const refresh = async () => {
    await feed.refetch();
  };
  const actions = {
    ensure,
    nickname,
    onNickname: remember,
    notify,
    refresh,
    ownerName: status.data?.owner ? profile.data?.profile?.fullName : undefined,
    enabled: status.data?.writesEnabled ?? false,
  };
  const posts = feed.data?.pages.flatMap(page => page.posts) || [];
  return (
    <div className="pf-page gb-page">
      <PortfolioHeader active="guestbook" />
      <main id="main-content">
        <section className="gb-hero pf-width" data-scene="intro">
          <p className="pf-eyebrow">GUESTBOOK</p>
          <h1>
            来过的话，
            <br />
            <span>留下句话吧。</span>
          </h1>
          <p>
            聊聊近况，分享一张照片，或是简单打个招呼。
            <br className="gb-desktop-break" />
            这里留给每一个来过的朋友。
          </p>
          <a href="#guestbook-feed" className="gb-hero-link">
            看看朋友们的留言 <ArrowDown size={16} />
          </a>
        </section>
        <div className="gb-main" data-scene="work">
          {notice && (
            <div className="gb-notice" role="status">
              <span>{notice}</span>
              <button onClick={() => setNotice("")} aria-label="关闭提示">
                知道了
              </button>
            </div>
          )}
          {status.data?.owner && (
            <Link className="gb-admin-link" to="/admin?tab=guestbook">
              你已以站长身份登录{" "}
              <span>
                管理留言 <ArrowUpRight size={15} />
              </span>
            </Link>
          )}
          <Composer {...actions} onDone={refresh} />
          <section
            id="guestbook-feed"
            className="gb-feed"
            aria-label="朋友留言"
          >
            <div className="gb-feed-heading">
              <h2>朋友们的留言</h2>
              <span>按时间记录</span>
            </div>
            {feed.isLoading && <p className="gb-empty">正在读留言…</p>}
            {feed.error && (
              <div className="gb-empty">
                <p>留言暂时无法读取。</p>
                <button onClick={() => void feed.refetch()}>重新加载</button>
              </div>
            )}
            {!feed.isLoading && !feed.error && !posts.length && (
              <div className="gb-empty">
                <span aria-hidden="true">✦</span>
                <h3>第一句话，留给你。</h3>
                <p>还没有留言。写点什么，让这里热闹起来。</p>
              </div>
            )}
            {posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                actions={actions}
                onPhoto={(images, index) => setViewer({ images, index })}
              />
            ))}
            {feed.hasNextPage && (
              <button
                className="gb-load-more"
                onClick={() => void feed.fetchNextPage()}
                disabled={feed.isFetchingNextPage}
              >
                {feed.isFetchingNextPage ? "读取中…" : "再看一些留言"}
              </button>
            )}
          </section>
        </div>
      </main>
      {profile.data?.profile && (
        <PortfolioFooter profile={profile.data.profile} />
      )}
      {viewer && (
        <PhotoViewer
          images={viewer.images}
          start={viewer.index}
          onClose={() => setViewer(null)}
        />
      )}
    </div>
  );
}
