"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const ELLIPSIS = "...";

const NICKNAME_TEXT_CLASS =
  "font-medium text-sm leading-snug text-ink sm:text-base";

type GuessingTargetNicknameProps = {
  nickname: string;
  className?: string;
};

function measureTextWidth(element: HTMLSpanElement, text: string): number {
  element.textContent = text;
  return element.offsetWidth;
}

export function GuessingTargetNickname({
  nickname,
  className,
}: GuessingTargetNicknameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [splitIndex, setSplitIndex] = useState(() => nickname.length);
  const [expanded, setExpanded] = useState(false);

  const characters = useMemo(() => Array.from(nickname), [nickname]);

  const recomputeSplit = useCallback(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    const containerWidth = container.clientWidth;
    if (containerWidth <= 0 || characters.length === 0) {
      setSplitIndex(characters.length);
      setExpanded(false);
      return;
    }

    const fullWidth = measureTextWidth(measure, nickname);
    if (fullWidth <= containerWidth) {
      setSplitIndex(characters.length);
      setExpanded(false);
      return;
    }

    const ellipsisWidth = measureTextWidth(measure, ELLIPSIS);
    const maxPrefixWidth = Math.max(0, containerWidth - ellipsisWidth);

    let nextSplitIndex = 0;
    for (let index = 1; index <= characters.length; index += 1) {
      const prefix = characters.slice(0, index).join("");
      if (measureTextWidth(measure, prefix) <= maxPrefixWidth) {
        nextSplitIndex = index;
      } else {
        break;
      }
    }

    if (nextSplitIndex === 0 && characters.length > 0) {
      nextSplitIndex = 1;
    }

    setSplitIndex(nextSplitIndex);
  }, [characters, nickname]);

  useLayoutEffect(() => {
    recomputeSplit();

    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(recomputeSplit);
    observer.observe(container);
    return () => observer.disconnect();
  }, [recomputeSplit]);

  const needsEllipsis = splitIndex < characters.length;
  const prefix = characters.slice(0, splitIndex).join("");
  const suffix = characters.slice(splitIndex).join("");

  return (
    <div className={cn("relative min-w-0", className)}>
      <span
        ref={measureRef}
        aria-hidden
        className={cn(
          "pointer-events-none invisible absolute whitespace-nowrap",
          NICKNAME_TEXT_CLASS,
        )}
      />
      <div ref={containerRef} className="flex min-w-0 items-baseline">
        <span className={cn("shrink-0 whitespace-nowrap", NICKNAME_TEXT_CLASS)}>
          {prefix}
        </span>
        {needsEllipsis ? (
          <button
            type="button"
            onClick={() => setExpanded((open) => !open)}
            className={cn("shrink-0", NICKNAME_TEXT_CLASS)}
            aria-expanded={expanded}
            aria-label={
              expanded ? "Hide remaining nickname" : "Show remaining nickname"
            }
          >
            {ELLIPSIS}
          </button>
        ) : null}
      </div>
      {expanded && needsEllipsis ? (
        <p className={cn("mt-1 wrap-break-word", NICKNAME_TEXT_CLASS)}>{suffix}</p>
      ) : null}
    </div>
  );
}
