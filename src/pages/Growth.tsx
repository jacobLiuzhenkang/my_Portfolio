import GrowthIntro from "@/components/GrowthIntro";
import { usePhoneLayout } from "@/hooks/use-phone-layout";
import PhoneGrowthHero from "@/components/mobile/PhoneGrowthHero";
import { ArrowLeft, ArrowUpRight, Download, FileText } from "lucide-react";
import { Link } from "react-router";
import {
  PortfolioFooter,
  PortfolioHeader,
  PublicLoading,
} from "@/components/PortfolioUI";
import { trpc } from "@/providers/trpc-client";

const groupMeta = [
  {
    name: "Agent",
    prefixes: ["Agent 协作"],
    english: "AGENT COLLABORATION",
    description: "拆解任务、组织上下文，校验并整合结果。",
  },
  {
    name: "AI 产品",
    prefixes: ["AI 产品", "AI 工作流"],
    english: "PRODUCT THINKING",
    description: "理解业务问题，定义产品路径与使用场景。",
  },
  {
    name: "交付",
    prefixes: ["工程实现"],
    english: "DELIVERY",
    description: "实现前后端，核对结果并协作推进交付。",
  },
];

export default function Growth() {
  const phone = usePhoneLayout();
  const { data, isLoading, error } = trpc.content.public.useQuery();
  if (isLoading) return <PublicLoading />;
  if (error || !data?.profile) return <PublicLoading failed />;
  const { profile, experiences } = data;
  const skillGroups = groupMeta
    .map(group => ({
      ...group,
      items: profile.skills
        .filter(skill =>
          group.prefixes.some(prefix => skill.startsWith(`${prefix}｜`))
        )
        .map(skill => skill.split("｜").slice(1).join("｜")),
    }))
    .filter(group => group.items.length > 0);
  const otherSkills = profile.skills.filter(skill => !skill.includes("｜"));
  return (
    <div className="pf-page pf-growth">
      <PortfolioHeader active="growth" />
      <main id="main-content">
        {phone ? (
          <PhoneGrowthHero profile={profile} />
        ) : (
          <section
            className="pf-growth-hero"
            data-scene="growth"
            aria-labelledby="growth-title"
          >
            <div className="pf-width">
              <p className="pf-eyebrow">ABOUT / {profile.englishName}</p>
              <GrowthIntro profile={profile} />
            </div>
          </section>
        )}
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
                        {experience.achievements.slice(0, 3).map(item => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <details className="pf-experience-details">
                        <summary>
                          展开工作内容 <ArrowUpRight size={15} />
                        </summary>
                        <ul>
                          {(experience.company.includes("夏商")
                            ? experience.achievements.slice(0, 3)
                            : experience.achievements
                          ).map(item => (
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
            <p className="pf-growth-education">
              教育 · {profile.education.split("\n").slice(0, 2).join(" · ")}
            </p>
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
              <Link className="pf-button pf-button-primary" to="/#contact">
                联系我 <ArrowUpRight size={17} />
              </Link>
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
                下载简历
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
