import { Mail } from "lucide-react";

import { LANDING_CONTACT, LANDING_SECTION_SCROLL_MT } from "@/lib/constants";

export function LandingContact() {
  const { email } = LANDING_CONTACT;
  const mailtoHref = `mailto:${email}?subject=${encodeURIComponent("Rolli inquiry")}`;

  return (
    <section
      id="contact"
      className={`${LANDING_SECTION_SCROLL_MT} border-t border-pink/40 bg-white px-5 py-14 md:py-20`}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center text-center">
        <p className="text-sm font-medium text-muted">Contact</p>
        <h2 className="font-display mt-2 text-2xl text-ink md:text-3xl">
          <span className="text-pink-highlight">Questions?</span> Reach out anytime.
        </h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted md:text-base">
          If you have feedback, partnership ideas, or need help with Rolli, I&apos;d love to hear
          from you.
        </p>

        <a
          href={mailtoHref}
          className="mt-8 inline-flex max-w-full items-center gap-2.5 break-all rounded-full border border-pink/50 bg-white px-6 py-3 text-sm font-medium text-ink shadow-soft transition-colors hover:border-pink-highlight/50 hover:text-pink-accent"
        >
          <Mail className="h-4 w-4 shrink-0 text-ink" aria-hidden />
          {email}
        </a>
      </div>
    </section>
  );
}
