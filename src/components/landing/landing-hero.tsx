"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useState } from "react";
import { TbDeviceMobileCheck } from "react-icons/tb";

import { MobileShell } from "@/components/layout/mobile-shell";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LANDING_SECTION_SCROLL_MT, PUBLIC_ASSETS } from "@/lib/constants";
import { PolaroidCard, polaroids } from "@/components/landing/polaroid-card";

const HERO_HEADLINE = (
  <>
    Capture <span className="text-pink-highlight">memories</span> anonymously.
  </>
);

const HERO_SUBCOPY = "Reveal them only when the hangout ends.";

const mobilePolaroids = [
  { ...polaroids[0], left: "-6%" },
  { ...polaroids[1], right: "-10%" },
  { ...polaroids[2], left: "-8%" },
  { ...polaroids[3], right: "-12%" },
  { ...polaroids[4], left: "2%" },
  { ...polaroids[5], right: "-4%" },
];

type HeroEllipseConfig = {
  width: number;
  height: number;
  backgroundColor: string;
  left?: number | string;
  right?: number | string;
  top?: number | string;
  bottom?: number | string;
  filter?: string;
  opacity?: number;
  animate: {
    x: number[];
    y: number[];
    scale: number[];
  };
  duration: number;
};

const HERO_ELLIPSES: Record<"mobile" | "desktop", HeroEllipseConfig[]> = {
  mobile: [
    {
      width: 220,
      height: 196,
      backgroundColor: "#FFF2FA",
      left: -56,
      top: 210,
      filter: "blur(34px)",
      opacity: 0.9,
      animate: { x: [0, 20, -10, 0], y: [0, -16, 10, 0], scale: [1, 1.02, 0.99, 1] },
      duration: 14,
    },
    {
      width: 190,
      height: 168,
      backgroundColor: "#FFE1F4",
      left: -48,
      top: 330,
      filter: "blur(32px)",
      opacity: 0.88,
      animate: { x: [0, -18, 12, 0], y: [0, 14, -12, 0], scale: [1, 0.98, 1.02, 1] },
      duration: 16,
    },
    {
      width: 124,
      height: 118,
      backgroundColor: "#FFE1F4",
      right: -26,
      bottom: -24,
      filter: "blur(26px)",
      opacity: 0.9,
      animate: { x: [0, -24, 8, 0], y: [0, -10, 14, 0], scale: [1, 1.03, 0.98, 1] },
      duration: 12,
    },
  ],
  desktop: [
    {
      width: 882,
      height: 784,
      backgroundColor: "#FFF2FA",
      left: -85,
      top: 334,
      animate: { x: [0, 20, -10, 0], y: [0, -16, 10, 0], scale: [1, 1.02, 0.99, 1] },
      duration: 14,
    },
    {
      width: 722,
      height: 644,
      backgroundColor: "#FFE1F4",
      left: -85,
      top: 540,
      animate: { x: [0, -18, 12, 0], y: [0, 14, -12, 0], scale: [1, 0.98, 1.02, 1] },
      duration: 16,
    },
    {
      width: 324,
      height: 308,
      backgroundColor: "#FFE1F4",
      right: -100,
      bottom: -140,
      animate: { x: [0, -24, 8, 0], y: [0, -10, 14, 0], scale: [1, 1.03, 0.98, 1] },
      duration: 12,
    },
  ],
};

function HeroLogo() {
  return (
    <Image
      src={PUBLIC_ASSETS.images.logo}
      alt="Rolli logo"
      fill
      priority
      className="object-cover"
    />
  );
}

function MobileHeroCard() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto h-[clamp(200px,34dvh,280px)] w-full max-w-[min(300px,88vw)] shrink-0"
    >
      {mobilePolaroids.map((p, i) => (
        <PolaroidCard key={i} polaroid={p} index={i} size="xs" />
      ))}
      <div className="absolute inset-0 z-20 flex items-center justify-center">
        <div className="relative size-[clamp(9rem,26dvh,12rem)] -translate-y-3 overflow-hidden rounded-full border border-white/75 bg-white/85 shadow-soft backdrop-blur-sm sm:-translate-y-4">
          <HeroLogo />
        </div>
      </div>
    </motion.div>
  );
}

function DesktopPolaroidPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.15, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto h-115 w-full max-w-md md:-mt-3 lg:-mt-2"
    >
      {polaroids.map((p, i) => (
        <PolaroidCard key={i} polaroid={p} index={i} size="lg" />
      ))}
      <div className="absolute inset-0 z-20 flex items-center justify-center">
        <div className="relative h-72 w-72 overflow-hidden rounded-full border border-white/75 bg-white/85 shadow-soft backdrop-blur-sm">
          <HeroLogo />
        </div>
      </div>
    </motion.div>
  );
}

function HeroBackgroundEllipses({ mobile = false }: { mobile?: boolean }) {
  const ellipses = HERO_ELLIPSES[mobile ? "mobile" : "desktop"];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {ellipses.map((ellipse, index) => (
        <motion.div
          key={index}
          className="absolute rounded-full"
          style={{
            width: ellipse.width,
            height: ellipse.height,
            backgroundColor: ellipse.backgroundColor,
            left: ellipse.left,
            right: ellipse.right,
            top: ellipse.top,
            bottom: ellipse.bottom,
            filter: ellipse.filter,
            opacity: ellipse.opacity ?? 1,
          }}
          animate={ellipse.animate}
          transition={{ duration: ellipse.duration, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

export function LandingHero() {
  const [showDesktopModal, setShowDesktopModal] = useState(false);

  return (
    <section id="hero" className={`${LANDING_SECTION_SCROLL_MT} overflow-x-hidden`}>
      {/* Mobile hero — full viewport height; content clears fixed navbar inside */}
      <div className="relative h-dvh min-h-dvh overflow-hidden supports-[height:100svh]:h-svh supports-[height:100svh]:min-h-svh md:hidden">
        <HeroBackgroundEllipses mobile />
        <MobileShell
          ambient={false}
          fillViewport={false}
          backgroundClassName="bg-white"
          className="flex h-full min-h-full flex-col justify-between gap-3 px-5 pt-(--navbar-total-height) pb-[max(2.25rem,calc(env(safe-area-inset-bottom)+1rem))] sm:px-8 sm:pb-[max(2.75rem,calc(env(safe-area-inset-bottom)+1.5rem))]"
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(185,147,214,0.25) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
              aria-hidden
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[clamp(0.75rem,2.5dvh,1.5rem)]"
          >
            <MobileHeroCard />

            <div className="mx-auto mt-[clamp(1.25rem,3.5dvh,2rem)] max-w-xs shrink-0 text-center">
              <h1 className="font-display text-[clamp(1.25rem,4.5dvh,1.5rem)] leading-tight tracking-tight text-ink">
                {HERO_HEADLINE}
              </h1>
              <p className="mt-1.5 text-[clamp(0.8125rem,2.2dvh,0.875rem)] leading-relaxed text-pink-muted/80">
                {HERO_SUBCOPY}
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="flex w-full shrink-0 flex-col items-center pt-1"
          >
            <Button
              href="/start"
              variant="gradient"
              className="h-13.5 w-full max-w-sm text-[15px] shadow-glow"
            >
              Start a hangout
            </Button>
          </motion.div>
        </MobileShell>
      </div>

      {/* Desktop hero */}
      <div className="relative hidden min-h-dvh overflow-hidden supports-[height:100svh]:min-h-svh md:block">
        <HeroBackgroundEllipses />

        <div className="relative mx-auto flex min-h-dvh w-full max-w-6xl items-center px-8 py-16 supports-[height:100svh]:min-h-svh lg:px-12">
          <div className="grid w-full grid-cols-2 items-center gap-12 lg:gap-16">
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-start gap-8 lg:gap-10"
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-lavender-deep/30 bg-gradient-pastel px-4 py-1.5 text-[10px] font-semibold uppercase tracking-overline text-white/90 shadow-glow">
                <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
                Anonymous until reveal
              </span>

              <div className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-overline">
                  <span className="text-pink-accent">Disposable</span>{" "}
                  <span className="text-pink-accent">camera</span>
                </p>
                <h1 className="font-display text-4xl leading-tight tracking-tight text-ink lg:text-5xl">
                  {HERO_HEADLINE}
                </h1>
                <p className="max-w-md text-lg leading-relaxed text-pink-muted/80">
                  {HERO_SUBCOPY}
                </p>
              </div>

              <Button
                type="button"
                variant="gradient"
                className="mt-3 h-13.5 w-auto min-w-55 px-10 text-[15px] shadow-glow lg:mt-4"
                onClick={() => setShowDesktopModal(true)}
              >
                Start a hangout
              </Button>
            </motion.div>

            <DesktopPolaroidPanel />
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={showDesktopModal}
        icon={
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-pink-accent/5 text-pink-accent">
            <TbDeviceMobileCheck className="text-[2rem]" aria-hidden="true" />
          </div>
        }
        title="Start Hangout on mobile"
        description={
          <>
            Rolli is optimized for mobile devices. To start a hangout, open this page on your phone or tablet.
            <br />
            <br />
            You can also copy the page link and open it on your mobile device.
          </>
        }
        confirmLabel="Got it"
        cancelLabel="Close"
        onConfirm={() => setShowDesktopModal(false)}
        onCancel={() => setShowDesktopModal(false)}
        showCancelButton={false}
      />
    </section>
  );
}
