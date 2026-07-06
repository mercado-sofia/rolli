"use client";

import { useEffect } from "react";

import { LandingContact } from "@/components/landing/landing-contact";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingGuide } from "@/components/landing/landing-guide";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingNavbar } from "@/components/landing/landing-navbar";
import { LandingPerfectFor } from "@/components/landing/landing-perfect-for";

export function LandingPage() {
  useEffect(() => {
    document.body.classList.add("landing-scrollbar");
    document.documentElement.classList.add("landing-scrollbar");
    return () => {
      document.body.classList.remove("landing-scrollbar");
      document.documentElement.classList.remove("landing-scrollbar");
    };
  }, []);

  return (
    <div className="overflow-x-hidden bg-canvas text-ink">
      <div className="landing-scrollbar h-screen overflow-y-auto scroll-smooth">
        <LandingNavbar />
        <LandingHero />
        <LandingGuide />
        <LandingPerfectFor />
        <LandingContact />
        <LandingFooter />
      </div>
    </div>
  );
}
