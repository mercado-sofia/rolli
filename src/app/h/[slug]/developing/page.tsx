"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

import { MobileLoadingSpinner } from "@/components/ui/mobile-loading-spinner";

/** Developing is an overlay on `/reveal` — keep this route as a redirect for old links. */
export default function DevelopingRedirectPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params.slug;

  useEffect(() => {
    router.replace(`/h/${slug}/reveal`);
  }, [router, slug]);

  return <MobileLoadingSpinner />;
}
