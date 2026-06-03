import type { Viewport } from "next";

/** Match developing overlay + header chrome so the OS status bar reads as white. */
export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RevealRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
