import { ArrowDown, ArrowUpRight, Download, ArrowRight } from "lucide-react";
import { Link } from "react-router";
type Profile = {fullName:string;role:string;company:string;location:string;transitionStory:string};
type CurrentWork = {company:string;role:string;period:string;summary:string};
export default function PhoneGrowthHero({profile,current}:{profile:Profile;current?:CurrentWork}) {
 return <section className="phone-growth-hero" data-scene="growth" aria-labelledby="growth-title"><div className="pf-width">
  <p className="phone-section-tag">职业路径 / ABOUT</p><h1 id="growth-title">{profile.fullName}<span>{profile.role}</span></h1><p className="phone-growth-location">{profile.company}<span>·</span>{profile.location}</p>
  <p className="phone-growth-path"><span>设计判断</span><ArrowRight size={14}/><span>产品定义</span><ArrowRight size={14}/><span>工程协作</span></p>
  {current&&<article className="phone-current-work"><div><span><i/>当前工作</span><time>{current.period}</time></div><h2>{current.company}</h2><p>{current.role}</p><p className="phone-current-summary">{current.summary}</p><Link to="/#work">VIFORM / SAC<span>查看近期实践<ArrowUpRight size={14}/></span></Link></article>}
  <div className="phone-growth-actions"><a className="pf-button pf-button-primary" href="/api/resume/download">下载中文简历<Download size={17}/></a><a className="phone-poster-secondary" href="#experience">完整经历<ArrowDown size={17}/></a></div>
  <details className="phone-career-story"><summary>关于我的职业转向<ArrowDown size={16}/></summary>{profile.transitionStory.split("\n").filter(Boolean).map(paragraph=><p key={paragraph}>{paragraph}</p>)}</details>
 </div></section>;
}
