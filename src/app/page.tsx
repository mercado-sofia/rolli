import { ClearLeavingAppOnMount } from "@/components/clear-leaving-app";
import { LandingPage } from "@/components/landing/landing-page";

export default function Home() {
  return (
    <>
      <ClearLeavingAppOnMount />
      <LandingPage />
    </>
  );
}
