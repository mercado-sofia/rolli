"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

import { APP_NAME, LANDING_NAV_SECTIONS, PUBLIC_ASSETS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const LANDING_NAVBAR_ID = "landing-navbar";

function getNavbarOffset() {
  const header = document.getElementById(LANDING_NAVBAR_ID);
  return header?.offsetHeight ?? 56;
}

function scrollToSection(sectionId: string) {
  const target = document.getElementById(sectionId);
  if (!target) return;

  const offset = getNavbarOffset();
  const top =
    target.getBoundingClientRect().top + window.scrollY - offset;

  window.scrollTo({
    top: Math.max(0, top),
    behavior: "smooth",
  });
}

export function LandingNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function onScroll() {
      setIsScrolled(window.scrollY > 8);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  function handleNavClick(sectionId: string) {
    setMenuOpen(false);
    requestAnimationFrame(() => {
      scrollToSection(sectionId);
    });
  }

  return (
    <header
      id={LANDING_NAVBAR_ID}
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b border-lavender/50 bg-white/85 pt-[env(safe-area-inset-top)] backdrop-blur-md transition-shadow duration-300",
        isScrolled && "shadow-navbar",
      )}
    >
      <nav
        className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:gap-4 sm:px-5 md:px-8"
        aria-label="Landing page"
      >
        <button
          type="button"
          onClick={() => scrollToSection("hero")}
          className="flex min-h-11 shrink-0 items-center justify-start gap-2 rounded-full px-1 transition-opacity hover:opacity-80"
        >
          <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-lavender/60 bg-white shadow-soft">
            <Image
              src={PUBLIC_ASSETS.images.logo}
              alt=""
              fill
              sizes="32px"
              className="object-cover"
            />
          </span>
          <span className="font-display truncate text-base leading-none text-ink sm:text-lg">
            {APP_NAME}
          </span>
        </button>

        <button
          type="button"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/80 text-ink transition-colors hover:bg-white sm:hidden"
          aria-expanded={menuOpen}
          aria-controls="landing-mobile-menu"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <ul className="hidden shrink-0 items-center gap-1 sm:flex">
          {LANDING_NAV_SECTIONS.map((section) => (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => scrollToSection(section.id)}
                className="group inline-flex cursor-pointer items-center justify-center rounded-full px-3 py-2 text-sm font-medium text-ink transition-colors"
              >
                <span className="relative inline-block whitespace-nowrap after:absolute after:left-0 after:-bottom-0.5 after:h-[1.5px] after:w-full after:origin-left after:scale-x-0 after:bg-pink after:transition-transform after:duration-300 after:content-[''] group-hover:after:scale-x-100">
                  {section.label}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 top-[calc(3.5rem+env(safe-area-inset-top,0))] z-40 bg-ink/20 sm:hidden"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
            <motion.div
              id="landing-mobile-menu"
              className="absolute inset-x-0 top-full z-50 border-b border-lavender/50 bg-white/95 px-3 py-3 shadow-soft backdrop-blur-md sm:hidden"
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <ul className="flex flex-col gap-1">
                {LANDING_NAV_SECTIONS.map((section, index) => (
                  <motion.li
                    key={section.id}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ delay: 0.03 * index, duration: 0.16 }}
                  >
                    <button
                      type="button"
                      onClick={() => handleNavClick(section.id)}
                      className="flex min-h-11 w-full items-center rounded-2xl px-4 text-left text-sm font-medium text-ink transition-colors hover:bg-lavender/40"
                    >
                      {section.label}
                    </button>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
