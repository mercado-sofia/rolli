"use client";

import Link from "next/link";

import { MobileLoadingSpinner } from "@/components/ui/mobile-loading-spinner";
import { useIsMobileDevice } from "@/hooks/use-is-mobile-device";

export function MobileOnlyAccessGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const isMobile = useIsMobileDevice();

  if (isMobile === undefined) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-canvas px-6 py-12 text-center">
        <MobileLoadingSpinner />
      </div>
    );
  }

  if (!isMobile) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-canvas px-6 py-12 text-center">
        <div className="mx-auto w-full max-w-lg rounded-3xl border border-slate-200 bg-white/95 px-8 py-12 shadow-lg shadow-slate-900/5 backdrop-blur-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-pink-muted">
            Mobile only
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Rolli is only available on mobile devices.
          </h1>
          <p className="mt-4 text-sm leading-7 text-muted">
            This experience is blocked on desktop. Open it on your phone or tablet to start a hangout.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              href="/"
              className="inline-flex rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink/90"
            >
              Back to landing page
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
