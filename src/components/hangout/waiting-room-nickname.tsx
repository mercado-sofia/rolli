"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

type WaitingRoomNicknameProps = {
  nickname: string;
};

const NICKNAME_TOGGLE_BUTTON_CLASS = cn(
  "inline-flex min-h-10 items-center justify-center rounded-full border border-black/8",
  "bg-[#FAFAFA] px-4 text-sm font-medium text-ink",
  "transition-colors hover:border-pink-highlight/30 hover:bg-white",
);

export function WaitingRoomNickname({ nickname }: WaitingRoomNicknameProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex items-center justify-between gap-4">
      <dt
        className={cn(
          "min-w-0 shrink font-medium wrap-break-word",
          visible ? "text-ink" : "text-muted",
        )}
      >
        {visible ? nickname : "Your nickname"}
      </dt>
      <dd className="shrink-0 text-right">
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          className={NICKNAME_TOGGLE_BUTTON_CLASS}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </dd>
    </div>
  );
}
