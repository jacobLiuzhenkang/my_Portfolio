import { ArrowUpRight, Download } from "lucide-react";
import { Link } from "react-router";

export const growthEvidence = [
  "夏商 · 已上线交付",
  "VIFORM · 可商业交付",
  "MemoRing · App Store",
];

type Profile = {
  fullName: string;
  role: string;
  location: string;
  headline: string;
  transitionStory: string;
};

export default function GrowthIntro({ profile }: { profile: Profile }) {
  return (
    <>
      <p className="pf-growth-identity">
        {profile.fullName}
        <span>{profile.role}</span>
        <small>{profile.location}</small>
      </p>
      <h1 id="growth-title">{profile.headline}</h1>
      <ul className="pf-growth-evidence" aria-label="项目交付证据">
        {growthEvidence.map(item => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <div className="pf-actions phone-growth-actions">
        <Link className="pf-button pf-button-primary" to="/#contact">
          联系我 <ArrowUpRight size={17} />
        </Link>
        <a className="pf-button pf-button-ghost" href="/api/resume/download">
          下载简历 <Download size={17} />
        </a>
      </div>
      <p className="pf-growth-path">UI/UX → 产品 → Agent 协作实现</p>
      <details className="pf-growth-story">
        <summary>展开职业转向</summary>
        {profile.transitionStory
          .split("\n")
          .filter(Boolean)
          .map(paragraph => (
            <p key={paragraph}>{paragraph}</p>
          ))}
      </details>
    </>
  );
}
