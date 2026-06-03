import { PUBLIC_ASSETS } from "@/lib/constants";
import { getMetadataBase } from "@/lib/metadata/site";

export function getDefaultOgImageUrl(): string {
  return new URL(PUBLIC_ASSETS.images.logo, getMetadataBase()).toString();
}

export const DEFAULT_OG_IMAGE = {
  url: getDefaultOgImageUrl(),
  width: 512,
  height: 512,
  alt: "Rolli",
} as const;
