import type { Metadata } from "next";

import { InviteLanding } from "@/app/h/[slug]/invite-landing";
import { APP_NAME } from "@/lib/constants";
import { DEFAULT_OG_IMAGE } from "@/lib/metadata/open-graph";
import { getInvitePageUrl } from "@/lib/metadata/site";
import { fetchHangoutBySlugServer } from "@/lib/services/hangouts-server";

type InvitePageProps = {
  params: Promise<{ slug: string }>;
};

function getInviteMetadataCopy(hangoutTitle?: string): {
  title: string;
  description: string;
} {
  if (hangoutTitle) {
    return {
      title: `You're invited · ${hangoutTitle}`,
      description: `Join "${hangoutTitle}" on ${APP_NAME} — anonymous photos, a delayed reveal, then guess who took each memory.`,
    };
  }

  return {
    title: `Join a ${APP_NAME} hangout`,
    description:
      "A cozy anonymous disposable camera for friends. Capture memories now, reveal identities later.",
  };
}

export async function generateMetadata({
  params,
}: InvitePageProps): Promise<Metadata> {
  const { slug } = await params;
  const { data: hangout } = await fetchHangoutBySlugServer(slug);
  const copy = getInviteMetadataCopy(hangout?.title);
  const pageUrl = getInvitePageUrl(slug);

  return {
    title: copy.title,
    description: copy.description,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title: copy.title,
      description: copy.description,
      url: pageUrl,
      siteName: APP_NAME,
      type: "website",
      locale: "en_US",
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: copy.title,
      description: copy.description,
      images: [DEFAULT_OG_IMAGE.url],
    },
  };
}

export default function InvitePage() {
  return <InviteLanding />;
}
