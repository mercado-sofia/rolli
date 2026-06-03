"use client";

import {
  motion,
  useReducedMotion,
  type HTMLMotionProps,
  type Variants,
} from "framer-motion";
import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

const LANDING_EASE = [0.22, 1, 0.36, 1] as const;

const VIEWPORT = { once: true, amount: 0.2, margin: "0px 0px -48px 0px" } as const;

type RevealDirection = "up" | "down" | "none";

function offsetForDirection(direction: RevealDirection, distance: number) {
  if (direction === "up") return { y: distance };
  if (direction === "down") return { y: -distance };
  return {};
}

type LandingRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: RevealDirection;
  distance?: number;
} & Pick<HTMLMotionProps<"div">, "id">;

export function LandingReveal({
  children,
  className,
  delay = 0,
  direction = "up",
  distance = 22,
  id,
}: LandingRevealProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      id={id}
      className={className}
      initial={
        prefersReducedMotion
          ? false
          : { opacity: 0, ...offsetForDirection(direction, distance) }
      }
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT}
      transition={{
        duration: prefersReducedMotion ? 0 : 0.65,
        delay: prefersReducedMotion ? 0 : delay,
        ease: LANDING_EASE,
      }}
    >
      {children}
    </motion.div>
  );
}

type LandingRevealGroupProps = {
  children: ReactNode;
  className?: string;
  stagger?: number;
};

const groupVariants: Variants = {
  hidden: {},
  visible: {},
};

export function LandingRevealGroup({
  children,
  className,
  stagger = 0.1,
}: LandingRevealGroupProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
      variants={groupVariants}
      transition={{
        staggerChildren: prefersReducedMotion ? 0 : stagger,
      }}
    >
      {children}
    </motion.div>
  );
}

type LandingRevealItemProps = {
  children: ReactNode;
  className?: string;
  direction?: RevealDirection;
  distance?: number;
};

const itemHidden = (
  prefersReducedMotion: boolean | null,
  direction: RevealDirection,
  distance: number,
): Variants["hidden"] =>
  prefersReducedMotion
    ? { opacity: 1, y: 0 }
    : { opacity: 0, ...offsetForDirection(direction, distance) };

export function LandingRevealItem({
  children,
  className,
  direction = "up",
  distance = 24,
}: LandingRevealItemProps) {
  const prefersReducedMotion = useReducedMotion();

  const variants: Variants = {
    hidden: itemHidden(prefersReducedMotion, direction, distance),
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.6,
        ease: LANDING_EASE,
      },
    },
  };

  return (
    <motion.div className={cn(className)} variants={variants}>
      {children}
    </motion.div>
  );
}
