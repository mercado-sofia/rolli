"use client";

import { useEffect, useState } from "react";

const MOBILE_UA_REGEX = /Android|webOS|iPhone|iPad|iPod|BlackBerry|BB|PlayBook|IEMobile|Opera Mini|Mobile|Silk/i;

export function useIsMobileDevice(): boolean | undefined {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const uaData = (navigator as any).userAgentData;
    const mobileClientHint =
      typeof uaData?.mobile === "boolean" ? uaData.mobile : undefined;
    const userAgent = navigator.userAgent || "";
    const isMobileUserAgent =
      mobileClientHint ?? MOBILE_UA_REGEX.test(userAgent);
    const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;

    setIsMobile(isMobileUserAgent || hasCoarsePointer);
  }, []);

  return isMobile;
}
