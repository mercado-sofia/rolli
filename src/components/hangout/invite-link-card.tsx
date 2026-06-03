"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { SetupFormCard } from "@/components/ui/setup-form-card";
import { cn } from "@/lib/utils";

type InviteLinkCardProps = {
  inviteUrl: string;
  hangoutTitle: string;
};

export function InviteLinkCard({ inviteUrl, hangoutTitle }: InviteLinkCardProps) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <SetupFormCard className="space-y-6">
      <div className="space-y-1.5">
        <p className="text-[13px] font-medium text-ink">Invitation link</p>
        <p className="text-sm leading-relaxed text-muted">
          Share this with friends for{" "}
          <span className="font-medium text-pink-accent">{hangoutTitle}</span>
        </p>
      </div>

      <div
        className={cn(
          "break-all rounded-2xl border border-container-border bg-[#FAFAFA] px-5 py-4",
          "font-mono text-[13px] leading-relaxed text-ink",
        )}
      >
        {inviteUrl}
      </div>

      <Button
        type="button"
        variant="secondary"
        className="h-13 gap-2"
        onClick={copyLink}
      >
        {copied ? (
          <>
            <Check className="h-4 w-4" />
            Copied!
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" />
            Copy link
          </>
        )}
      </Button>
    </SetupFormCard>
  );
}
