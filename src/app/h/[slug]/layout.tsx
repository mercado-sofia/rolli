"use client";

import { useParams } from "next/navigation";

import { RevealAmbientAudio } from "@/components/hangout/reveal-ambient-audio";
import {
  HangoutDisplayProvider,
  useDisplayHangout,
} from "@/contexts/hangout-display-context";
import { useInHangoutSession } from "@/hooks/use-in-hangout-session";
import { shouldPlayRevealAmbientMusic } from "@/lib/hangout/reveal-audio";

function HangoutSlugLayoutContent({ children }: { children: React.ReactNode }) {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { displayHangout } = useDisplayHangout();
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

export default function HangoutSlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  return (
    <HangoutDisplayProvider slug={slug}>
      <HangoutSlugLayoutContent>{children}</HangoutSlugLayoutContent>
    </HangoutDisplayProvider>
  );
}
