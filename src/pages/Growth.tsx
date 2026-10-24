import { ArrowLeft, ArrowUpRight, Download, FileText } from "lucide-react";
import { Link } from "react-router";
import {
  PortfolioFooter,
  PortfolioHeader,
  PublicLoading,
} from "@/components/PortfolioUI";
import { trpc } from "@/providers/trpc";

const groupMeta = [
  {
    name: "Agent 协作",
    english: "AGENT COLLABORATION",
    description: "拆解任务、组织上下文，校验并整合结果。",
  },
  {
    name: "AI 产品",
    english: "PRODUCT THINKING",
    description: "理解业务问题，定义产品路径与使用场景。",
  },
  {
    name: "工程实现",
    english: "PRODUCT ENGINEERING",
    description: "借助 AI 协作开发，让产品可以实际运行。",
  },
  {
    name: "AI 工作流",
    english: "APPLIED WORKFLOWS",
    description: "把模型、工具与实际内容生产流程连接起来。",
  },
];

export default function Growth() {
  const { data, isLoading, error } = trpc.content.public.useQuery();
  if (isLoading) return <PublicLoading />;
  if (error || !data?.profile) return <PublicLoading failed />;
  const { profile, experiences } = data;
  const skillGroups = groupMeta
    .map(group => ({
      ...group,
      items: profile.skills
        .filter(skill => skill.startsWith(`${group.name}｜`))
        .map(skill => skill.slice(group.name.length + 1)),
    }))
    .filter(group => group.items.length > 0);
  const otherSkills = profile.skills.filter(skill => !skill.includes("｜"));
  return (
    <div className="pf-page pf-growth">
      <PortfolioHeader active="growth" />
      <main id="main-content">
        <section
          className="pf-growth-hero"
          data-scene="growth"
          aria-labelledby="growth-title"
        >
          <div className="pf-width">
            <p className="pf-eyebrow">ABOUT / {profile.englishName}</p>
            <h1 id="growth-title">
              从设计出发，
              <br />
              <span>走向产品交付。</span>
            </h1>
            <p className="pf-growth-identity">
              {profile.fullName}
              <span>{profile.role}</span>
              <small>
                {profile.company} · {profile.location}
              </small>
            </p>
            <div className="pf-growth-introduction">
              {profile.transitionStory
                .split("\n")
                .filter(Boolean)
                .map(paragraph => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
            </div>
            <div className="pf-actions">
              <a
                className="pf-button pf-button-primary"
                href="/api/resume/download"
              >
                下载中文简历 <Download size={17} />
              </a>
              <Link className="pf-case-link" to="/#work">
                查看我的作品 <ArrowUpRight size={17} />
              </Link>
            </div>
          </div>
        </section>
        <section
          className="pf-experience pf-section"
          id="experience"
          data-scene="work"
          aria-labelledby="experience-title"
        >
          <div className="pf-width">
            <div className="pf-section-heading">
              <div>
                <p className="pf-eyebrow">EXPERIENCE</p>
                <h2 id="experience-title">工作与项目经历</h2>
              </div>
              <p>
                设计判断、产品思维与工程实践，
                <br />
                在一路所做的事情里积累。
              </p>
            </div>
            <div className="pf-experience-list">
              {experiences.map((experience, index) => (
                <article
                  key={experience.id}
                  className={index === 0 ? "is-current" : ""}
                >
                  <div className="pf-experience-date">
                    <span>{experience.period}</span>
                    {index === 0 && (
                      <small>
                        <i className="pf-live-dot" />
                        当前工作
                      </small>
                    )}
                  </div>
                  <div className="pf-experience-main">
                    <h3>{experience.company}</h3>
                    <p className="pf-experience-role">{experience.role}</p>
                    <p className="pf-experience-summary">
                      {experience.summary}
                    </p>
                    {index === 0 ? (
                      <ul>
                        {experience.achievements.map(item => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <details className="pf-experience-details">
                        <summary>
                          展开工作内容 <ArrowUpRight size={15} />
                        </summary>
                        <ul>
                          {experience.achievements.map(item => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section
          className="pf-toolkit pf-section"
          data-scene="process"
          aria-labelledby="toolkit-title"
        >
          <div className="pf-width">
            <div className="pf-section-heading">
              <div>
                <p className="pf-eyebrow">CAPABILITIES</p>
                <h2 id="toolkit-title">能力与工具</h2>
              </div>
              <p>
                工具持续变化，
                <br />
                理解问题与校验结果的责任始终在人。
              </p>
            </div>
            <div className="pf-skill-matrix">
              {skillGroups.map(group => (
                <article key={group.name}>
                  <p className="pf-eyebrow">{group.english}</p>
                  <h3>{group.name}</h3>
                  <p>{group.description}</p>
                  <ul>
                    {group.items.map(skill => (
                      <li key={skill}>{skill}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
            {otherSkills.length > 0 && (
              <ul className="pf-tags pf-other-skills">
                {otherSkills.map(skill => (
                  <li key={skill}>{skill}</li>
                ))}
              </ul>
            )}
            <div className="pf-foundation">
              <div>
                <p className="pf-eyebrow">DESIGN FOUNDATION</p>
                <p>UI/UX · 视觉设计 · Design Ops · 品牌与组件体系</p>
              </div>
              <div>
                <p className="pf-eyebrow">EDUCATION</p>
                <h3>{profile.education.split("\n")[0]}</h3>
                <p>{profile.education.split("\n").slice(1).join(" · ")}</p>
              </div>
            </div>
          </div>
        </section>
        <section
          className="pf-resume"
          data-scene="contact"
          aria-labelledby="resume-title"
        >
          <div className="pf-width">
            <div>
              <p className="pf-eyebrow">RESUME / 中文简历</p>
              <h2 id="resume-title">把完整经历带走。</h2>
              <p>一份便于阅读和分享的 PDF，记录当前定位、项目与职业经历。</p>
            </div>
            <div className="pf-actions">
              <a
                className="pf-button pf-button-ghost"
                href="/api/resume/download?preview=1"
                target="_blank"
                rel="noreferrer"
              >
                <FileText size={17} />
                在线预览
              </a>
              <a
                className="pf-button pf-button-primary"
                href="/api/resume/download"
              >
                <Download size={17} />
                下载 PDF
              </a>
            </div>
          </div>
        </section>
        <div className="pf-width pf-back-row">
          <Link className="pf-case-link" to="/#work">
            <ArrowLeft size={17} />
            返回作品
          </Link>
        </div>
      </main>
      <PortfolioFooter profile={profile} />
    </div>
  );
}
