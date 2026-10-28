import GrowthIntro from "@/components/GrowthIntro";

type Profile = {
  fullName: string;
  role: string;
  location: string;
  headline: string;
  transitionStory: string;
};

export default function PhoneGrowthHero({ profile }: { profile: Profile }) {
  return (
    <section
      className="phone-growth-hero"
      data-scene="growth"
      aria-labelledby="growth-title"
    >
      <div className="pf-width">
        <p className="phone-section-tag">职业路径 / ABOUT</p>
        <GrowthIntro profile={profile} />
      </div>
    </section>
  );
}
