"use client";

import { Camera, Film, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { TbCashHeart } from "react-icons/tb";

import {
  LandingReveal,
  LandingRevealGroup,
  LandingRevealItem,
} from "@/components/landing/landing-reveal";
import { GUIDE_STEPS, LANDING_SECTION_SCROLL_MT } from "@/lib/constants";

const STEP_ICONS = {
  camera: Camera,
  film: Film,
  cashHeart: TbCashHeart,
} as const;

type StepIconKey = keyof typeof STEP_ICONS;

export function LandingGuide() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  function toggle(i: number) {
    setActiveIndex((current) => (current === i ? null : i));
  }

  return (
    <section
      id="guide"
      className={`${LANDING_SECTION_SCROLL_MT} overflow-x-hidden bg-canvas px-5 py-16 md:py-24`}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 md:gap-14">
        <LandingReveal className="relative mx-auto mb-2 max-w-xl overflow-visible text-center md:max-w-2xl">
          <p className="text-sm font-medium text-muted">Guide for rolli</p>
          <h2 className="font-display mt-2 text-3xl text-ink md:text-4xl">
            Capture blind,{" "}
            <span className="text-pink-highlight">reveal</span> together
          </h2>
        </LandingReveal>

        <LandingRevealGroup className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
          {GUIDE_STEPS.map((step, i) => {
            const Icon = STEP_ICONS[step.icon as StepIconKey] ?? Camera;
            const isActive = activeIndex === i;

            return (
              <LandingRevealItem key={step.title}>
                <div
                  onClick={() => toggle(i)}
                  className={`group relative h-80 cursor-pointer select-none overflow-hidden rounded-3xl border transition-colors duration-200 ${
                    isActive
                      ? "border-pink-highlight bg-pink-highlight-faint"
                      : "border-lavender/50 bg-white"
                  }`}
                >
                {/* Plus / minus toggle */}
                <button
                  type="button"
                  aria-label={isActive ? "Close step details" : "Open step details"}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(i);
                  }}
                  className={`absolute right-3.5 top-3.5 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-all duration-250 ${
                    isActive
                      ? "bg-white text-pink-highlight"
                      : "bg-lavender/60 text-pink-accent group-hover:bg-pink-highlight group-hover:text-white"
                  }`}
                >
                  {isActive ? (
                    <Minus className="h-4 w-4 stroke-[2.5]" />
                  ) : (
                    <Plus className="h-4 w-4 stroke-[2.5]" />
                  )}
                </button>

                {/* Default face */}
                <div
                  className={`absolute inset-0 flex flex-col transition-opacity duration-200 ${
                    isActive ? "opacity-0" : "opacity-100"
                  }`}
                >
                  {/* Icon area */}
                  <div className="flex flex-1 items-center justify-center">
                    <div className="flex h-22 w-22 items-center justify-center rounded-full bg-pink-highlight/12">
                      <div className="flex h-18 w-18 items-center justify-center rounded-full bg-white">
                        <Icon className="guide-card-icon h-10 w-10 text-pink-highlight transition-colors duration-200 md:text-ink md:group-hover:text-pink-highlight" />
                      </div>
                    </div>
                  </div>

                  {/* Footer text */}
                  <div className="border-t border-lavender/30 px-5 py-4">
                    <p className="font-display text-base leading-snug text-ink">
                      {step.heading}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted">
                      {step.title}
                    </p>
                  </div>
                </div>

                {/* Detail face */}
                <div
                  className={`absolute inset-0 flex flex-col gap-3 bg-pink-highlight-faint p-5 transition-all duration-220 ${
                    isActive
                      ? "translate-y-0 opacity-100"
                      : "pointer-events-none translate-y-3 opacity-0"
                  }`}
                >
                  <span className="text-base font-semibold text-pink-accent">
                    Step {i + 1}
                  </span>

                  <p className="font-display text-xl leading-snug text-ink">
                    {step.heading}
                  </p>

                  <p className="mt-3 flex-1 text-base leading-relaxed text-ink">
                    {step.description}
                  </p>

                  <p className="border-t border-pink-highlight/25 pt-3 text-sm italic leading-relaxed text-pink-accent">
                    {step.tip}
                  </p>
                </div>
                </div>
              </LandingRevealItem>
            );
          })}
        </LandingRevealGroup>
      </div>
    </section>
  );
}