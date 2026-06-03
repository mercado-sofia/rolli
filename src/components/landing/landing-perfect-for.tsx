import { GradientIconContainer } from "@/components/ui/gradient-icon-container";
import {
  LandingIcon,
  PERFECT_FOR_ICONS,
} from "@/components/landing/landing-icons";
import { LANDING_SECTION_SCROLL_MT } from "@/lib/constants";

const useCases = [
  {
    icon: PERFECT_FOR_ICONS.birthdays,
    title: "Birthdays",
    description:
      "Everyone captures the night — no one knows who took what until the reveal.",
  },
  {
    icon: PERFECT_FOR_ICONS.nightsOut,
    title: "Nights out",
    description:
      "Candid moments from every angle, without phones dominating the table.",
  },
  {
    icon: PERFECT_FOR_ICONS.trips,
    title: "Trips & weekends",
    description:
      "One shared roll for the whole crew. Memories develop when you're ready.",
  },
] as const;

export function LandingPerfectFor() {
  return (
    <section
      id="perfect-for"
      className={`${LANDING_SECTION_SCROLL_MT} overflow-x-hidden border-t border-pink/40 bg-white px-5 py-16 md:py-24`}
    >
      <div className="mx-auto w-full max-w-6xl">
        <div className="mx-auto max-w-xl text-center md:max-w-2xl">
          <p className="text-sm font-medium text-muted">Perfect for</p>
          <h2 className="font-display mt-2 text-3xl text-ink md:text-4xl">
            Any <span className="text-pink-highlight">hangout</span> worth remembering
          </h2>
        </div>

        <div className="mt-10 grid gap-5 md:mt-14 md:grid-cols-3 md:gap-6">
          {useCases.map((item) => (
            <article
              key={item.title}
              className="group flex flex-col items-center rounded-3xl border border-pink/50 bg-white p-8 text-center transition-all duration-300 ease-out hover:-translate-y-2 hover:border-pink-highlight/50 hover:bg-white hover:shadow-glow md:p-10"
            >
              <GradientIconContainer size="lg" borderTone="pink" className="shadow-glow">
                <LandingIcon icon={item.icon} size={28} className="text-ink" />
              </GradientIconContainer>
              <h3 className="font-display mt-5 text-xl text-ink transition-colors duration-300 group-hover:text-pink-accent">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
