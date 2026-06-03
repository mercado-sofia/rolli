import Link from "next/link";

import { SetupFlowHeader } from "@/components/layout/setup-flow-header";
import {
  SetupFlowFooter,
  SetupFlowShell,
  SETUP_FLOW_HEADER_CLASS,
  SETUP_FLOW_MAIN_CENTER_CLASS,
  SETUP_FLOW_MAIN_CLASS,
  SETUP_FLOW_MAIN_INNER_CLASS,
} from "@/components/layout/setup-flow-shell";
import { Card } from "@/components/ui/card";
import { APP_CHOICE_GRID_CLASS } from "@/lib/app-page-layout";
import { SETUP_FLOW_TOTAL_STEPS, setupFlowSteps } from "@/lib/hangout/setup";
import { cn } from "@/lib/utils";

export default function StartPage() {
  return (
    <SetupFlowShell>
      <header className={SETUP_FLOW_HEADER_CLASS}>
        <SetupFlowHeader
          currentStep={setupFlowSteps.start}
          totalSteps={SETUP_FLOW_TOTAL_STEPS}
          backHref="/"
          backLabel="Back to home"
          title="Get started"
          sublabel="Choose how to join"
          titleTone="ink"
        />
      </header>

      <main
        className={cn(
          SETUP_FLOW_MAIN_CLASS,
          SETUP_FLOW_MAIN_CENTER_CLASS,
        )}
      >
        <div className={cn(SETUP_FLOW_MAIN_INNER_CLASS, APP_CHOICE_GRID_CLASS, "md:w-full")}>
          <Link href="/create" className="group block h-full min-h-0">
            <Card
              className={cn(
                "flex h-full min-h-44 flex-col transition-[transform,box-shadow,border-color] duration-300 ease-out",
                "hover:scale-[1.01] hover:shadow-glow active:scale-[0.99] md:min-h-52 md:p-8 md:hover:border-pink-highlight",
              )}
            >
              <p className="text-[11px] font-medium uppercase tracking-overline text-pink-muted">
                Option A
              </p>
              <h2 className="font-display mt-2 text-2xl text-ink md:text-[1.65rem] lg:text-2xl">
                <span className="text-pink-highlight">Create</span> Invitation Link
              </h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted md:text-base">
                You become the Film Keeper and control when memories develop.
              </p>
            </Card>
          </Link>

          <Link href="/join" className="group block h-full min-h-0">
            <Card
              className={cn(
                "flex h-full min-h-44 flex-col transition-[transform,box-shadow,border-color] duration-300 ease-out",
                "hover:scale-[1.01] hover:shadow-glow active:scale-[0.99] md:min-h-52 md:p-8 md:hover:border-pink-highlight",
              )}
            >
              <p className="text-[11px] font-medium uppercase tracking-overline text-pink-muted">
                Option B
              </p>
              <h2 className="font-display mt-2 text-2xl text-ink md:text-[1.65rem] lg:text-2xl">
                <span className="text-pink-highlight">Paste</span> Invitation Link
              </h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted md:text-base">
                Join anonymously with a nickname and hidden real name.
              </p>
            </Card>
          </Link>
        </div>
      </main>

      <SetupFlowFooter hint="Pick create or paste link — you'll be in the room in a moment." />
    </SetupFlowShell>
  );
}
