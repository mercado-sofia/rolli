"use client";

import { useEffect } from "react";

import { LandingContact } from "@/components/landing/landing-contact";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingGuide } from "@/components/landing/landing-guide";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingNavbar } from "@/components/landing/landing-navbar";
import { LandingPerfectFor } from "@/components/landing/landing-perfect-for";

function getNavbarOffset() {
  const header = document.getElementById("landing-navbar");
  return header?.offsetHeight ?? 56;
}

function scrollToHash() {
  const hash = window.location.hash.slice(1); // Remove the '#'
  if (!hash) return;

  const target = document.getElementById(hash);
  if (!target) return;

  const offset = getNavbarOffset();
  const container = document.getElementById("landing-scroll-container") as HTMLElement | null;

  // Scroll after a small delay to ensure DOM is ready
  const scrollFn = () => {
    if (container && container.scrollHeight > container.clientHeight) {
      // Desktop: scroll the custom container
      let element = target as HTMLElement | null;
      let position = 0;

      while (element && element !== container) {
        position += element.offsetTop;
        element = element.offsetParent as HTMLElement | null;
      }

      container.scrollTo({
        top: Math.max(0, position - offset),
        behavior: "smooth",
      });
    } else {
      // Mobile: scroll the window
      let element = target as HTMLElement | null;
      let position = 0;

      while (element) {
        position += element.offsetTop;
        element = element.offsetParent as HTMLElement | null;
      }

      window.scrollTo({
        top: Math.max(0, position - offset),
        behavior: "smooth",
      });
    }
  };

  setTimeout(scrollFn, 100);
}

export function LandingPage() {
  useEffect(() => {
    document.body.classList.add("landing-scrollbar");
    document.documentElement.classList.add("landing-scrollbar");
    return () => {
      document.body.classList.remove("landing-scrollbar");
      document.documentElement.classList.remove("landing-scrollbar");
    };
  }, []);

  useEffect(() => {
    // Scroll to hash on initial page load
    scrollToHash();

    // Listen for hash changes
    window.addEventListener("hashchange", scrollToHash);
    return () => window.removeEventListener("hashchange", scrollToHash);
  }, []);

  return (
    <div className="overflow-x-hidden bg-canvas text-ink">
      <div
        id="landing-scroll-container"
        className="landing-scrollbar h-screen overflow-y-auto scroll-smooth"
      >
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
