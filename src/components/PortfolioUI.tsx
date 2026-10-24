import { useEffect, useRef, useState } from "react";
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
import { useSceneMotion } from "@/hooks/use-scene-motion";

export type ProjectView = {
  id: number;
  title: string;
  subtitle: string;
  category: string;
  description: string;
  content: string;
  tags: string[];
  coverUrl: string | null;
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

export function PortfolioHeader({ active }: { active: "work" | "growth" }) {
  const [menu, setMenu] = useState(false);
  const { enabled, systemReduced, toggle } = useSceneMotion();
  useEffect(() => {
    const close = () => setMenu(false);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("popstate", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("popstate", close);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <header className="pf-header">
      <Link className="pf-brand" to="/" aria-label="刘振康作品集首页">
        <span>LZ</span>
        <i>®</i>
        <small>
          LIU ZHENKANG
          <br />
          PRODUCT × DESIGN × AI
        </small>
      </Link>
      <nav
        className={menu ? "pf-nav is-open" : "pf-nav"}
        aria-label="公开作品导航"
        onClick={() => setMenu(false)}
      >
        <Link className={active === "work" ? "active" : ""} to="/#work">
          <span>01</span> 精选作品 <small>SELECTED WORK</small>
        </Link>
        <Link className={active === "growth" ? "active" : ""} to="/growth">
          <span>02</span> 我的成长 <small>MY WORK LIFE</small>
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
      <button
        className="pf-menu"
        onClick={() => setMenu(!menu)}
        aria-expanded={menu}
        aria-label={menu ? "关闭导航" : "打开导航"}
      >
        {menu ? <X /> : <Menu />}
      </button>
      <ScrollTelemetry />
    </header>
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
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.showModal();
    document.body.classList.add("dialog-open");
    return () => document.body.classList.remove("dialog-open");
  }, []);

  return (
    <dialog
      ref={ref}
      className="project-dialog pf-dialog"
      data-lenis-prevent
      onClose={onClose}
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
              target="_blank"
              rel="noreferrer"
            >
              查看项目演示 <ArrowUpRight size={17} />
            </a>
          )}
        </div>
        <div className="dialog-body">
          <div className="project-story">
            {project.content
              .split("\n")
              .map((line, index) =>
                !line.trim() ? (
                  <span key={index} className="story-space" />
                ) : [
                    "项目背景",
                    "我的贡献",
                    "关键取舍",
                    "协作与边界",
                    "当前阶段",
                    "图集说明",
                    "验证方式",
                  ].includes(line.trim()) ? (
                  <h3 key={index}>{line}</h3>
                ) : (
                  <p key={index}>{line}</p>
                )
              )}
          </div>
          <div className="project-gallery">
            {project.gallery.map((src, index) => (
              <img
                key={src}
                src={src}
                alt={`${project.title} 项目图 ${index + 1}`}
                width={1400}
                height={1000}
                loading="lazy"
              />
            ))}
          </div>
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
      <p>{failed ? "暂时无法读取内容，请稍后重试。" : "正在连接作品数据库"}</p>
      {failed && (
        <button onClick={() => window.location.reload()}>重新加载 ↗</button>
      )}
    </main>
  );
}
