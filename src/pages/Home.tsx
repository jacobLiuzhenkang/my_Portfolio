import { usePhoneLayout } from "@/hooks/use-phone-layout";
import { PHONE_QUERY } from "@contracts/phone-visual";
import { projectCoverSources } from "@contracts/project-covers";
import PhoneHomeHero from "@/components/mobile/PhoneHomeHero";
import {
  caseCloseUsesHistoryBack,
  caseSlugFromPath,
  findProjectBySlug,
  projectPath,
  readHistoryIndex,
} from "@/lib/project-slug";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, Braces } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  PortfolioFooter,
  PortfolioHeader,
  ProjectDialog,
  PublicLoading,
  type ProjectView,
} from "@/components/PortfolioUI";
import { trpc } from "@/providers/trpc-client";

const capabilities = [
  ["理解问题", "梳理业务现场、使用场景与约束，找到真正需要解决的问题。"],
  ["定义产品", "把需求整理成清晰的流程、交互与视觉，让方案可以被验证。"],
  ["协作实现", "组织上下文与 Agent 任务，完成前后端实现，校验实际结果。"],
  ["推进交付", "与工程同事协作审查、优化、联调与部署，让产品可以持续迭代。"],
];

function ProjectCard({
  project,
  featured = false,
  onOpen,
}: {
  project: ProjectView;
  featured?: boolean;
  onOpen: () => void;
}) {
  const status = project.tags.find(tag => /验证|审阅|迭代|上线/.test(tag));
  const cover = projectCoverSources(project.coverUrl);
  return (
    <article className={`pf-project${featured ? " is-featured" : ""}`}>
      <button
        className="pf-project-media"
        onClick={onOpen}
        aria-label={`查看 ${project.title} 项目详情`}
      >
        {project.coverUrl ? (
          <picture>
            {cover && <>
              <source media={PHONE_QUERY} srcSet={cover.mobile} />
              <source media="(min-width: 1200px)" srcSet={cover.wide} />
            </>}
            <img
              src={cover?.desktop ?? project.coverUrl}
              alt={`${project.title} ${cover ? "项目封面" : "实际项目画面"}`}
              width={1600}
              height={1000}
              loading={featured ? "eager" : "lazy"}
            />
          </picture>
        ) : (
          <span>{project.title}</span>
        )}
        <span className="pf-view-case">
          查看案例 <ArrowUpRight size={17} />
        </span>
      </button>
      <div className="pf-project-copy">
        <div className="pf-project-meta">
          <span>{project.category}</span>
          {status && (
            <span className="pf-status">
              <i />
              {status}
            </span>
          )}
        </div>
        <h3>{project.title}</h3>
        <p className="pf-project-role">{project.subtitle}</p>
        <p className="pf-project-description">{project.description}</p>
        <ul className="pf-tags" aria-label="项目关键词">
          {project.tags
            .filter(tag => tag !== status)
            .slice(0, 3)
            .map(tag => (
              <li key={tag}>{tag}</li>
            ))}
        </ul>
        <div className="pf-project-actions">
          <button className="pf-case-link" onClick={onOpen}>
            阅读项目案例 <ArrowRight size={17} />
          </button>
          {featured && project.demoUrl && (
            <a
              className="pf-case-link"
              href={project.demoUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`访问 ${project.title} 项目`}
            >
              访问项目 <ArrowUpRight size={17} />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

export default function Home() {
  const phone = usePhoneLayout();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const slug = caseSlugFromPath(pathname);
  const { data, isLoading, error } = trpc.content.public.useQuery();
  const [filter, setFilter] = useState("全部");
  const openedAtIndex = useRef<number | null>(null);
  const projects = (data?.projects as ProjectView[] | undefined) ?? [];
  const selected = findProjectBySlug(projects, slug);
  useLayoutEffect(() => {
    openedAtIndex.current = slug ? readHistoryIndex() : null;
  }, [slug]);
  useEffect(() => {
    if (!slug) {
      document.title = "刘振康 · AI 产品工程师";
      return;
    }
    if (selected) document.title = `${selected.title} · 刘振康`;
  }, [selected, slug]);
  useEffect(() => {
    if (!slug || isLoading || error || !data?.profile || selected) return;
    navigate("/#work", { replace: true });
  }, [data?.profile, error, isLoading, navigate, selected, slug]);
  const openProject = (project: ProjectView) => {
    const path = projectPath(project, projects);
    if (window.location.pathname !== path) navigate(path);
  };
  const closeProject = () => {
    if (caseCloseUsesHistoryBack(readHistoryIndex(), openedAtIndex.current)) {
      navigate(-1);
      return;
    }
    navigate("/#work", { replace: true });
  };
  if (isLoading) return <PublicLoading />;
  if (error || !data?.profile) return <PublicLoading failed />;
  const { profile } = data;
  const categories = [
    "全部",
    ...new Set(projects.map(project => project.category)),
  ];
  const visible =
    filter === "全部"
      ? projects
      : projects.filter(project => project.category === filter);
  const featured = visible.filter(project => project.featured).slice(0, 2);
  const earlier = visible.filter(
    project => !featured.some(item => item.id === project.id)
  );
  return (
    <div className="pf-page pf-home">
      <PortfolioHeader active="work" />
      <main id="main-content">
        {phone ? <PhoneHomeHero profile={profile} project={featured[0] || projects[0]} /> : (
        <section
          className="pf-hero"
          data-scene="intro"
          aria-labelledby="home-title"
        >
          <div className="pf-width pf-hero-inner">
            <div className="pf-hero-copy">
              <p className="pf-identity">
                <span className="pf-live-dot" />
                {profile.fullName}
                <span className="pf-identity-divider">/</span>
                {profile.role}
              </p>
              <h1 id="home-title">
                {profile.headline.includes("，") ? (
                  <>
                    {profile.headline.slice(
                      0,
                      profile.headline.indexOf("，") + 1
                    )}
                    <br />
                    {profile.headline.slice(profile.headline.indexOf("，") + 1)}
                  </>
                ) : (
                  profile.headline
                )}
              </h1>
              <p className="pf-hero-introduction">{profile.introduction}</p>
              <div className="pf-actions">
                <Link className="pf-button pf-button-primary" to="/#work">
                  查看近期作品 <ArrowDown size={17} />
                </Link>
                <Link className="pf-button pf-button-ghost" to="/growth">
                  了解我的经历 <ArrowUpRight size={17} />
                </Link>
              </div>
              <p className="pf-hero-location">
                {profile.company}
                <span>·</span>
                {profile.location}
                <span>·</span>产品 / 设计 / AI
              </p>
            </div>
            <div className="pf-hero-atmosphere" aria-hidden="true">
              <span>HUMAN INTUITION × MACHINE CAPABILITY</span>
              <p>1 Person + AI</p>
              <small>从理解问题，到让产品运行。</small>
            </div>
          </div>
        </section>
        )}
        <section
          className="pf-work pf-section"
          id="work"
          data-scene="work"
          aria-labelledby="work-title"
        >
          <div className="pf-width">
            <div className="pf-section-heading">
              <div>
                <p className="pf-eyebrow">SELECTED WORK</p>
                <h2 id="work-title">近期作品与实践</h2>
              </div>
              <p>
                从创作工具到业务体验，
                <br />
                在具体项目里说明我如何工作。
              </p>
            </div>
            <div className="pf-filters" role="group" aria-label="筛选作品">
              {categories.map(category => (
                <button
                  key={category}
                  className={filter === category ? "active" : ""}
                  aria-pressed={filter === category}
                  onClick={() => setFilter(category)}
                >
                  {category}
                </button>
              ))}
            </div>
            <div className="pf-featured-list">
              {featured.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  featured
                  onOpen={() => openProject(project)}
                />
              ))}
            </div>
            {earlier.length > 0 && (
              <div className="pf-earlier-work">
                <div className="pf-subheading">
                  <h3>更多设计作品</h3>
                  <p>界面、硬件体验与品牌视觉的积累。</p>
                </div>
                <div className="pf-project-grid">
                  {earlier.map(project => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onOpen={() => openProject(project)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
        <section
          className="pf-process pf-section"
          id="approach"
          data-scene="process"
          aria-labelledby="approach-title"
        >
          <div className="pf-width">
            <div className="pf-section-heading">
              <div>
                <p className="pf-eyebrow">HOW I WORK</p>
                <h2 id="approach-title">把想法推进到可以验证。</h2>
              </div>
              <Braces
                className="pf-section-icon"
                size={32}
                aria-hidden="true"
              />
            </div>
            {!phone && <p className="pf-process-intro">{profile.workingStyle}</p>}
            <ol className="pf-process-grid">
              {capabilities.map(([title, text], index) => (
                <li key={title}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </li>
              ))}
            </ol>
            {phone && <details className="phone-method-note"><summary>展开协作方式 <ArrowDown size={16}/></summary><p>{profile.workingStyle}</p></details>}
          </div>
        </section>
        <section className="pf-growth-link" data-scene="process">
          <div className="pf-width">
            <div>
              <p className="pf-eyebrow">THE PATH BEHIND THE WORK</p>
              <h2>
                设计是起点，
                <br />
                产品交付是现在的位置。
              </h2>
              <p>关于我的职业经历、工作方式，以及持续积累的能力。</p>
            </div>
            <Link className="pf-button pf-button-ghost" to="/growth">
              我的成长 <ArrowUpRight size={18} />
            </Link>
          </div>
        </section>
      </main>
      <PortfolioFooter profile={profile} />
      {selected && <ProjectDialog project={selected} onClose={closeProject} />}
    </div>
  );
}
