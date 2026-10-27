import ContactForm from "./ContactForm";
import { track } from "@/lib/analytics";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Copy,
  Menu,
  MessageSquare,
  Pause,
  Play,
  X,
} from "lucide-react";
import { Link } from "react-router";
import * as NavigationDialog from "@radix-ui/react-dialog";
import { useSceneMotion } from "@/hooks/use-scene-motion";

const CaseStudy = lazy(() => import("./CaseStudy"));

export type ProjectView = {
  id: number;
  title: string;
  subtitle: string;
  category: string;
  description: string;
  content: string;
  tags: string[];
  coverUrl: string | null;
  coverImage?: string | null;
  gallery: string[];
  demoUrl: string | null;
  featured: boolean;
};

type ProfileContact = {
  fullName: string;
  englishName: string;
  email: string;
  location: string;
};

function ScrollTelemetry() {
  const rail = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const root = document.documentElement;
      const distance = Math.max(1, root.scrollHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, window.scrollY / distance));
      rail.current?.style.setProperty("--pf-scroll-progress", String(progress));
      if (label.current)
        label.current.textContent = String(Math.round(progress * 100)).padStart(
          3,
          "0"
        );
    };
    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    const observer = new ResizeObserver(requestUpdate);
    observer.observe(document.documentElement);
    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="pf-scroll-telemetry" ref={rail} aria-hidden="true">
      <span className="pf-scroll-label">SCROLL</span>
      <div className="pf-scroll-rail">
        <i className="pf-scroll-progress" />
        <b className="pf-scroll-cursor" />
        <em />
        <em />
        <em />
        <em />
        <em />
      </div>
      <span className="pf-scroll-value">
        <span ref={label}>000</span>
        <small>%</small>
      </span>
    </div>
  );
}

export function PortfolioHeader({
  active,
}: {
  active: "work" | "growth" | "guestbook";
}) {
  const [menu, setMenu] = useState(false);
  const { enabled, systemReduced, toggle } = useSceneMotion();
  useEffect(() => {
    const close = () => setMenu(false);
    const desktop = window.matchMedia("(min-width: 761px)");
    const resize = () => {
      if (desktop.matches) close();
    };
    window.addEventListener("popstate", close);
    desktop.addEventListener("change", resize);
    return () => {
      window.removeEventListener("popstate", close);
      desktop.removeEventListener("change", resize);
    };
  }, []);
  useEffect(() => {
    if (!menu) return;
    document.body.classList.add("dialog-open");
    return () => document.body.classList.remove("dialog-open");
  }, [menu]);

  return (
    <NavigationDialog.Root open={menu} onOpenChange={setMenu}>
      <header className="pf-header">
        <Link className="pf-brand" to="/" aria-label="刘振康作品集首页">
          <img
            className="pf-brand-wordmark"
            src="/brand/jacob/wordmark.svg"
            alt="Jacob"
            width={416}
            height={128}
          />
          <small>
            LIU ZHENKANG
            <br />
            PRODUCT × DESIGN × AI
          </small>
        </Link>
        <nav className="pf-nav" aria-label="公开作品导航">
          <Link className={active === "work" ? "active" : ""} to="/#work">
            <span>01</span> 精选作品 <small>SELECTED WORK</small>
          </Link>
          <Link className={active === "growth" ? "active" : ""} to="/growth">
            <span>02</span> 我的成长 <small>MY WORK LIFE</small>
          </Link>
          <Link
            className={active === "guestbook" ? "active" : ""}
            to="/guestbook"
          >
            留言板
          </Link>
          <a href={active === "work" ? "#contact" : "/#contact"}>
            <span>03</span> 联系我 <small>CONTACT</small>
          </a>
        </nav>
        <button
          className="pf-motion-toggle"
          onClick={toggle}
          disabled={systemReduced}
          aria-pressed={!enabled}
          aria-label={
            systemReduced
              ? "静态显示，遵循系统设置"
              : enabled
                ? "暂停动效"
                : "开启动效"
          }
          title={systemReduced ? "已遵循系统的减少动态效果设置" : undefined}
        >
          {enabled ? <Pause size={14} /> : <Play size={14} />}
          <span>
            {systemReduced ? "静态显示" : enabled ? "暂停动效" : "开启动效"}
          </span>
        </button>
        <NavigationDialog.Trigger asChild>
          <button className="pf-menu" aria-label="打开导航">
            <Menu size={28} aria-hidden="true" />
          </button>
        </NavigationDialog.Trigger>
        <ScrollTelemetry />
      </header>
      <NavigationDialog.Portal>
        <NavigationDialog.Overlay
          className="pf-mobile-overlay"
          data-motion={enabled ? "running" : "static"}
        />
        <NavigationDialog.Content
          className="pf-mobile-drawer"
          data-lenis-prevent
          data-motion={enabled ? "running" : "static"}
        >
          <div className="pf-drawer-top">
            <NavigationDialog.Title className="pf-drawer-title">
              站点导航
            </NavigationDialog.Title>
            <NavigationDialog.Close
              className="pf-drawer-close"
              aria-label="关闭导航"
            >
              <X size={26} aria-hidden="true" />
            </NavigationDialog.Close>
          </div>
          <NavigationDialog.Description className="sr-only">
            查看精选作品、职业成长与联系方式。
          </NavigationDialog.Description>
          <nav className="pf-drawer-links" aria-label="手机导航">
            <Link
              to="/#work"
              className={active === "work" ? "active" : undefined}
              onClick={() => setMenu(false)}
            >
              <span>
                <strong>精选作品</strong>
                <small>SELECTED WORK</small>
              </span>
              <ArrowUpRight size={27} aria-hidden="true" />
            </Link>
            <Link
              to="/growth"
              className={active === "growth" ? "active" : undefined}
              onClick={() => setMenu(false)}
            >
              <span>
                <strong>我的成长</strong>
                <small>MY WORK LIFE</small>
              </span>
              <ArrowUpRight size={27} aria-hidden="true" />
            </Link>
            <Link
              to="/guestbook"
              className={active === "guestbook" ? "active" : undefined}
              onClick={() => setMenu(false)}
            >
              <span>
                <strong>留言板</strong>
                <small>LEAVE A NOTE</small>
              </span>
              <MessageSquare size={26} aria-hidden="true" />
            </Link>
            <Link to="/#contact" onClick={() => setMenu(false)}>
              <span>
                <strong>联系我</strong>
                <small>CONTACT</small>
              </span>
              <ArrowUpRight size={27} aria-hidden="true" />
            </Link>
          </nav>
          <div className="pf-drawer-footer">
            <p>刘振康 · AI 产品工程师</p>
            <button
              className="pf-drawer-motion"
              onClick={toggle}
              disabled={systemReduced}
              aria-pressed={!enabled}
            >
              {enabled ? <Pause size={18} /> : <Play size={18} />}
              {systemReduced
                ? "静态显示，遵循系统设置"
                : enabled
                  ? "暂停背景动效"
                  : "开启背景动效"}
            </button>
          </div>
        </NavigationDialog.Content>
      </NavigationDialog.Portal>
    </NavigationDialog.Root>
  );
}

export function ProjectDialog({
  project,
  onClose,
}: {
  project: ProjectView;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    let unmounting = false;
    if (!dialog.open) dialog.showModal();
    document.body.classList.add("dialog-open");
    const handleClose = () => {
      if (unmounting) return;
      // Drop the scroll lock before navigation. Lenis is stopped and
      // overflow is hidden while it remains, so /#work cannot stick.
      document.body.classList.remove("dialog-open");
      onCloseRef.current();
    };
    dialog.addEventListener("close", handleClose);
    return () => {
      // Drop the listener before the node goes away. A close() here can be
      // delivered to the listener from the next mount and immediately pop history.
      unmounting = true;
      dialog.removeEventListener("close", handleClose);
      document.body.classList.remove("dialog-open");
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className="project-dialog pf-dialog"
      data-lenis-prevent
      onClick={event =>
        event.target === event.currentTarget && ref.current?.close()
      }
    >
      <div className="dialog-shell">
        <button
          className="icon-button dialog-close"
          onClick={() => ref.current?.close()}
          aria-label="关闭项目详情"
        >
          <X size={20} />
        </button>
        <div className="dialog-heading">
          <p className="meta-label">CASE FILE / {project.category}</p>
          <h2>{project.title}</h2>
          <p>{project.subtitle}</p>
          {project.demoUrl && (
            <a
              className="text-link"
              href={project.demoUrl}
              onClick={() => track("outbound_click")}
              target="_blank"
              rel="noreferrer"
            >
              查看项目演示 <ArrowUpRight size={17} />
            </a>
          )}
        </div>
        <div className="dialog-body">
          <Suspense fallback={<p>正在打开项目内容…</p>}>
            <CaseStudy
              content={project.content}
              gallery={project.gallery}
              title={project.title}
              description={project.description}
            />
          </Suspense>
        </div>
      </div>
    </dialog>
  );
}

function WechatDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    document.body.classList.add("dialog-open");
    return () => document.body.classList.remove("dialog-open");
  }, []);
  return (
    <dialog
      ref={ref}
      className="wechat-dialog"
      onClose={onClose}
      onClick={event =>
        event.target === event.currentTarget && ref.current?.close()
      }
    >
      <button
        className="icon-button"
        onClick={() => ref.current?.close()}
        aria-label="关闭微信二维码"
      >
        <X size={18} />
      </button>
      <p className="meta-label">WECHAT / DIRECT LINE</p>
      <h2>保持联系</h2>
      <img
        src="/images/wechat/LK_wechat.webp"
        width={560}
        height={560}
        alt="刘振康的微信二维码"
      />
      <p>扫码添加微信，备注来意。</p>
    </dialog>
  );
}

export function PortfolioFooter({ profile }: { profile: ProfileContact }) {
  const [wechat, setWechat] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyEmail = async () => {
    await navigator.clipboard.writeText(profile.email);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <>
      <footer className="pf-footer" id="contact" data-scene="contact">
        <div className="pf-width">
          <div className="pf-footer-top">
            <span>CONTACT</span>
            <span>{profile.location} · CHINA</span>
          </div>
          <p className="pf-footer-kicker">交流一个问题，或者一起推进一件事。</p>
          <h2>
            让下一个想法，
            <br />
            <em>开始运行。</em>
          </h2>
          <a className="pf-email" href={`mailto:${profile.email}`}>
            <span>{profile.email}</span>
            <ArrowUpRight />
          </a>
          <ContactForm />
          <div className="pf-footer-bottom">
            <p>
              <i /> {profile.fullName} / {profile.englishName}
              <br />
              现居 {profile.location} · 开放交流
            </p>
            <div>
              <button onClick={copyEmail}>
                {copied ? <Check /> : <Copy />}
                {copied ? "已复制" : "复制邮箱"}
              </button>
              <Link to="/guestbook" className="pf-footer-guestbook">
                <MessageSquare />
                给我留言
              </Link>
              <button onClick={() => setWechat(true)}>
                <MessageSquare />
                微信
              </button>
            </div>
            <p>
              © {new Date().getFullYear()}
              <br />
              DESIGNED &amp; BUILT WITH AI
            </p>
          </div>
        </div>
      </footer>
      {wechat && <WechatDialog onClose={() => setWechat(false)} />}
      {copied && <div className="toast">邮箱已复制到剪贴板</div>}
    </>
  );
}

export function PublicLoading({ failed = false }: { failed?: boolean }) {
  return (
    <main className="pf-loading">
      <div className="pf-loader-code">
        LZ://PORTFOLIO<span>_</span>
      </div>
      <p>{failed ? "暂时无法读取内容，请稍后重试。" : "正在载入作品集"}</p>
      {failed && (
        <button onClick={() => window.location.reload()}>重新加载 ↗</button>
      )}
    </main>
  );
}
