"use client";

import { useElapsedTimer } from "@/hooks/use-elapsed-timer";
import { formatDuration } from "@/lib/hangout/format-duration";

type ElapsedTimerProps = {
  startedAt: string | null;
};

export function ElapsedTimer({ startedAt }: ElapsedTimerProps) {
  const elapsedMs = useElapsedTimer(startedAt);
  const elapsedLabel = startedAt ? formatDuration(elapsedMs) : "00:00:00";

  return (
    <div className="w-full bg-transparent text-center">
      <p className="text-sm text-muted">Elapsed time</p>
      <p className="font-display mt-2 text-4xl tabular-nums text-ink sm:text-5xl">
        {elapsedLabel}
      </p>
    </div>
  );
}
