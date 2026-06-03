"use client";

import { useParams } from "next/navigation";

import { RevealAmbientAudio } from "@/components/hangout/reveal-ambient-audio";
import { useDisplayHangout } from "@/hooks/use-display-hangout";
import { useInHangoutSession } from "@/hooks/use-in-hangout-session";
import { shouldPlayRevealAmbientMusic } from "@/lib/hangout/reveal-audio";

export default function HangoutSlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { displayHangout } = useDisplayHangout(slug);
  const inHangoutSession = useInHangoutSession(slug);

  const status = displayHangout?.status;
  const revealMusicActive =
    inHangoutSession && shouldPlayRevealAmbientMusic(status);
  const revealMusicPreparing = inHangoutSession && status === "developing";

  return (
    <>
      <RevealAmbientAudio
        active={revealMusicActive}
        preparing={revealMusicPreparing}
      />
      {children}
    </>
  );
}
