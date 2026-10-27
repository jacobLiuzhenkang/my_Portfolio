import { ArrowDown, ArrowUpRight, ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { displayCoverUrl } from "@contracts/pdf-asset";
import { splitPhoneHeadline } from "@contracts/phone-visual";
import type { ProjectView } from "../PortfolioUI";
type Profile = {
  fullName: string;
  role: string;
  location: string;
  headline: string;
  introduction: string;
};
export default function PhoneHomeHero({
  profile,
  project,
}: {
  profile: Profile;
  project?: ProjectView;
}) {
  const title = splitPhoneHeadline(profile.headline);
  const coverUrl = project ? displayCoverUrl(project.coverUrl) : null;
  return (
    <section
      className="phone-poster"
      data-scene="intro"
      aria-labelledby="home-title"
    >
      <div className="phone-poster-id">
        <p>
          <strong>{profile.fullName}</strong>
          <span>{profile.role}</span>
        </p>
        <span className="phone-poster-location">
          <i />
          {profile.location}
        </span>
      </div>
      <div className="phone-poster-message">
        <h1 id="home-title">
          {title.lead && <span>{title.lead}</span>}
          <strong>{title.emphasis}</strong>
        </h1>
        <p>{profile.introduction}</p>
      </div>
      <div className="phone-poster-bottom">
        <div className="phone-poster-actions">
          <Link className="pf-button pf-button-primary" to="/#work">
            查看近期作品
            <ArrowDown size={17} />
          </Link>
          <Link className="phone-poster-secondary" to="/#contact">
            联系我
            <ArrowUpRight size={17} />
          </Link>
          <Link className="pf-hero-resume-link" to="/growth">
            经历与简历
          </Link>
        </div>
        {project && (
          <Link className="phone-work-peek" to="/#work">
            {coverUrl && (
              <img
                src={coverUrl}
                alt={project.title + " 产品画面"}
                width={160}
                height={90}
              />
            )}
            <span>
              <small>近期在做</small>
              <strong>{project.title.split(" · ")[0]}</strong>
            </span>
            <ArrowRight size={20} />
          </Link>
        )}
      </div>
    </section>
  );
}
