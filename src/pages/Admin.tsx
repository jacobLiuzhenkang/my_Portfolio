import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BriefcaseBusiness,
  FolderLock,
  Images,
  KeyRound,
  LogOut,
  UserRound,
} from "lucide-react";
import { trpc } from "@/providers/trpc-client";
import ProfileManager from "@/components/admin/ProfileManager";
import ExperienceManager from "@/components/admin/ExperienceManager";
import ProjectManager from "@/components/admin/ProjectManager";
import FileManager from "@/components/admin/FileManager";
import GuestbookManager from "@/components/admin/GuestbookManager";
import AccountManager from "@/components/admin/AccountManager";
import { Field, FormActions } from "@/components/admin/common";

function AuthPanel({
  setup,
  onSuccess,
  onError,
}: {
  setup: boolean;
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const setupMutation = trpc.auth.setup.useMutation({
    onSuccess,
    onError: e => onError(e.message),
  });
  const loginMutation = trpc.auth.login.useMutation({
    onSuccess,
    onError: e => onError(e.message),
  });
  const pending = setupMutation.isPending || loginMutation.isPending;
  return (
    <main className="auth-page">
      <div className="auth-aside">
        <a className="brand" href="/">
          LZ<span>®</span>
        </a>
        <div>
          <p className="meta-label">PRIVATE CONTENT STUDIO</p>
          <h1>
            你的简历，
            <br />
            由你持续更新。
          </h1>
          <p>作品、经历、文件与下载版本，统一在一个安全后台维护。</p>
        </div>
        <small>LIU ZHENKANG · AI PRODUCT ENGINEER</small>
      </div>
      <div className="auth-main">
        <form
          className="auth-form"
          onSubmit={e => {
            e.preventDefault();
            if (setup && password !== confirm) {
              onError("两次输入的密码不一致");
              return;
            }
            const input = { username, password };
            setup ? setupMutation.mutate(input) : loginMutation.mutate(input);
          }}
        >
          <p className="meta-label">
            {setup ? "FIRST-TIME SETUP" : "ADMINISTRATOR LOGIN"}
          </p>
          <h2>{setup ? "初始化管理员" : "登录管理后台"}</h2>
          <p>
            {setup
              ? "创建你唯一的管理员账号。初始化入口将在账号创建后永久关闭。"
              : "使用你自己的账号密码进入内容后台。"}
          </p>
          <Field
            label="管理员账号"
            value={username}
            onChange={setUsername}
            placeholder="字母、数字或 _ . -"
            required
          />
          <Field
            label="密码"
            value={password}
            onChange={setPassword}
            type="password"
            hint="至少 10 位"
            required
          />
          {setup && (
            <Field
              label="再次输入密码"
              value={confirm}
              onChange={setConfirm}
              type="password"
              required
            />
          )}
          <FormActions
            pending={pending}
            label={setup ? "创建账号并进入后台" : "登录"}
          />
          <a className="back-link" href="/">
            <ArrowLeft size={15} />
            返回公开简历
          </a>
        </form>
      </div>
    </main>
  );
}

const tabs = [
  { id: "profile", label: "简历正文", icon: UserRound },
  { id: "experience", label: "工作经历", icon: BriefcaseBusiness },
  { id: "projects", label: "作品管理", icon: Images },
  { id: "files", label: "文件与 PDF", icon: FolderLock },
  { id: "guestbook", label: "留言管理", icon: Images },
  { id: "account", label: "账号安全", icon: KeyRound },
] as const;
type Tab = (typeof tabs)[number]["id"];

export default function Admin() {
  const status = trpc.auth.status.useQuery();
  const [tab, setTab] = useState<Tab>(() =>
    new URLSearchParams(window.location.search).get("tab") === "guestbook"
      ? "guestbook"
      : "profile"
  );
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const utils = trpc.useUtils();
  const user = status.data?.user;
  const content = trpc.content.admin.useQuery(undefined, {
    enabled: Boolean(user),
  });
  const logout = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      await utils.invalidate();
      setTab("profile");
    },
  });

  useEffect(() => {
    if (content.error?.data?.code === "UNAUTHORIZED")
      void utils.auth.status.invalidate();
  }, [content.error, utils]);

  const onSuccess = async () => {
    await utils.auth.status.invalidate();
    await utils.content.admin.invalidate();
  };
  const saved = (text = "修改已保存，并同步到公开页面") => {
    setNotice({ type: "success", text });
    window.setTimeout(() => setNotice(null), 2600);
  };
  const failed = (text: string) => {
    setNotice({ type: "error", text });
    window.setTimeout(() => setNotice(null), 4200);
  };

  if (status.isLoading)
    return (
      <main className="loading-screen admin-loading">
        <span className="status-dot" />
        <p>正在检查管理员会话</p>
      </main>
    );
  if (status.error)
    return (
      <main className="loading-screen admin-loading">
        <p>无法连接后台服务。</p>
        <button className="text-link" onClick={() => status.refetch()}>
          重试
        </button>
      </main>
    );
  if (!status.data?.configured)
    return (
      <>
        <AuthPanel setup onSuccess={onSuccess} onError={failed} />
        {notice && <div className={`toast ${notice.type}`}>{notice.text}</div>}
      </>
    );
  if (!user)
    return (
      <>
        <AuthPanel setup={false} onSuccess={onSuccess} onError={failed} />
        {notice && <div className={`toast ${notice.type}`}>{notice.text}</div>}
      </>
    );

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <a className="brand" href="/">
          LZ<span>®</span>
        </a>
        <div className="admin-user">
          <span className="status-dot" />
          <div>
            <strong>{user.displayName}</strong>
            <small>管理员 · {user.username}</small>
          </div>
        </div>
        <nav aria-label="后台功能">
          {tabs.map(item => (
            <button
              key={item.id}
              className={tab === item.id ? "active" : ""}
              onClick={() => setTab(item.id)}
            >
              <item.icon size={17} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <a href="/" target="_blank" rel="noreferrer">
            <ArrowLeft size={16} />
            查看公开页面
          </a>
          <button onClick={() => logout.mutate()}>
            <LogOut size={16} />
            退出登录
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <div className="admin-mobile-tabs">
          {tabs.map(item => (
            <button
              key={item.id}
              className={tab === item.id ? "active" : ""}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        {content.isLoading && (
          <div className="admin-content-loading">
            <span className="status-dot" />
            正在读取内容
          </div>
        )}
        {content.error && (
          <div className="admin-error">
            内容读取失败：{content.error.message}
            <button onClick={() => content.refetch()}>重试</button>
          </div>
        )}
        {content.data?.profile && (
          <>
            {tab === "profile" && (
              <ProfileManager
                profile={content.data.profile}
                onSaved={() => saved()}
                onError={failed}
              />
            )}
            {tab === "experience" && (
              <ExperienceManager
                experiences={content.data.experiences}
                onSaved={() => saved()}
                onError={failed}
              />
            )}
            {tab === "projects" && (
              <ProjectManager
                projects={content.data.projects}
                onSaved={() => saved()}
                onError={failed}
              />
            )}
            {tab === "files" && (
              <FileManager
                onSaved={() => saved("文件已更新")}
                onError={failed}
              />
            )}
            {tab === "guestbook" && (
              <GuestbookManager
                onSaved={() => saved("留言管理已更新")}
                onError={failed}
              />
            )}
            {tab === "account" && (
              <AccountManager
                username={user.username}
                onSaved={() => saved("密码已更新，当前会话已续期")}
                onError={failed}
              />
            )}
          </>
        )}
      </main>
      {notice && <div className={`toast ${notice.type}`}>{notice.text}</div>}
    </div>
  );
}
