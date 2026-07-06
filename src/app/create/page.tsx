"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { InviteLinkCard } from "@/components/hangout/invite-link-card";
import { SetupFlowHeader } from "@/components/layout/setup-flow-header";
import {
  SetupFlowFooter,
  SetupFlowShell,
  SETUP_FLOW_HEADER_CLASS,
  SETUP_FLOW_MAIN_CENTER_CLASS,
  SETUP_FLOW_MAIN_CLASS,
  SETUP_FLOW_MAIN_INNER_CLASS,
} from "@/components/layout/setup-flow-shell";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { SetupFormCard } from "@/components/ui/setup-form-card";
import { createHangoutWithKeeper } from "@/lib/hangout/hangout-api";
import { buildInviteUrl } from "@/lib/hangout/join";
import { APP_PRIMARY_BUTTON_CLASS, APP_SETUP_FORM_MAX_WIDTH } from "@/lib/app-page-layout";
import { NICKNAME_MIN_LENGTH } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { SETUP_FLOW_TOTAL_STEPS, setupFlowSteps } from "@/lib/hangout/setup";
import { usePreventAutoKeyboard } from "@/hooks/use-prevent-auto-keyboard";
import { useSessionStore } from "@/store/session-store";
import { MobileOnlyAccessGate } from "@/components/mobile-only-access-gate";

const schema = z.object({
  title: z.string().min(3, "Give your hangout a title"),
  nickname: z
    .string()
    .trim()
    .min(
      NICKNAME_MIN_LENGTH,
      `Nickname must be at least ${NICKNAME_MIN_LENGTH} characters`,
    ),
  realName: z.string().min(2, "Enter your real name (hidden until reveal)"),
});

type FormValues = z.infer<typeof schema>;

type CreatedHangout = {
  slug: string;
  title: string;
  inviteUrl: string;
};

const CREATE_FORM_ID = "create-hangout-form";

export default function CreatePage() {
  const router = useRouter();
  const setSession = useSessionStore((state) => state.setSession);
  const [created, setCreated] = useState<CreatedHangout | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [enteringWaitingRoom, setEnteringWaitingRoom] = useState(false);

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", nickname: "", realName: "" },
  });

  usePreventAutoKeyboard(step === 2);

  async function onSubmit(values: FormValues) {
    setSubmitError(null);

    const { data, error } = await createHangoutWithKeeper({
      title: values.title,
      nickname: values.nickname,
      realName: values.realName,
    });

    if (error || !data) {
      setSubmitError(error ?? "Could not create hangout");
      return;
    }

    setSession(data.hangout, data.participant);

    const { slug } = data.hangout;
    setCreated({
      slug,
      title: values.title,
      inviteUrl: buildInviteUrl(slug),
    });
  }

  function enterWaitingRoom() {
    if (!created || enteringWaitingRoom) return;
    setEnteringWaitingRoom(true);
    router.push(`/h/${created.slug}/waiting`);
  }

  async function handleProceedToIdentityStep() {
    const isTitleValid = await trigger("title");
    if (!isTitleValid) return;
    (document.activeElement as HTMLElement | null)?.blur();
    setStep(2);
    setSubmitError(null);
  }

  if (created) {
    return (
      <MobileOnlyAccessGate>
        <SetupFlowShell>
          <header className={SETUP_FLOW_HEADER_CLASS}>
            <SetupFlowHeader
              currentStep={setupFlowSteps.createLinkReady}
              totalSteps={SETUP_FLOW_TOTAL_STEPS}
              onBack={() => {
                setCreated(null);
                setStep(2);
              }}
              backLabel="Back to identity"
              title="Ready to roll!"
              sublabel="Share with your friends"
            />
          </header>

          <main
            className={cn(
              SETUP_FLOW_MAIN_CLASS,
              SETUP_FLOW_MAIN_CENTER_CLASS,
            )}
          >
            <div
              className={cn(
                SETUP_FLOW_MAIN_INNER_CLASS,
                "w-full",
                APP_SETUP_FORM_MAX_WIDTH,
              )}
            >
              <InviteLinkCard
                inviteUrl={created.inviteUrl}
                hangoutTitle={created.title}
              />
            </div>
          </main>

          <SetupFlowFooter hint="Share the link with friends, then enter when you're ready.">
            <Button
              type="button"
              onClick={enterWaitingRoom}
              disabled={enteringWaitingRoom}
              className={APP_PRIMARY_BUTTON_CLASS}
            >
              {enteringWaitingRoom ? "Entering waiting room…" : "Enter waiting room"}
            </Button>
          </SetupFlowFooter>
        </SetupFlowShell>
      </MobileOnlyAccessGate>
    );
  }

  const currentStep =
    step === 1 ? setupFlowSteps.createTitle : setupFlowSteps.createIdentity;

  return (
    <MobileOnlyAccessGate>
      <SetupFlowShell>
        <header className={SETUP_FLOW_HEADER_CLASS}>
        <SetupFlowHeader
          currentStep={currentStep}
          totalSteps={SETUP_FLOW_TOTAL_STEPS}
          backHref={step === 1 ? "/start" : undefined}
          onBack={step === 2 ? () => setStep(1) : undefined}
          backLabel={step === 1 ? "Back to start" : "Back to title"}
          title={step === 1 ? "New hangout" : "Your identity"}
          sublabel={
            step === 1 ? "Name your hangout" : "Set your anonymous identity"
          }
        />
      </header>

      <main
        className={cn(
          SETUP_FLOW_MAIN_CLASS,
          SETUP_FLOW_MAIN_CENTER_CLASS,
        )}
      >
        <div
          className={cn(
            SETUP_FLOW_MAIN_INNER_CLASS,
            "flex w-full flex-col gap-6",
            APP_SETUP_FORM_MAX_WIDTH,
          )}
        >
          <SetupFormCard>
            <form
              id={CREATE_FORM_ID}
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-6"
            >
              {step === 1 ? (
                <Field
                  id="title"
                  label="Hangout title"
                  placeholder="sponty gala"
                  error={errors.title?.message}
                  {...register("title")}
                />
              ) : (
                <>
                  <Field
                    id="nickname"
                    label="Anonymous nickname"
                    placeholder="Enter nickname here"
                    error={errors.nickname?.message}
                    autoComplete="off"
                    {...register("nickname")}
                  />
                  <Field
                    id="realName"
                    label="Real name (hidden)"
                    placeholder="Enter real name here"
                    error={errors.realName?.message}
                    autoComplete="off"
                    {...register("realName")}
                  />
                </>
              )}
              {submitError && (
                <p className="rounded-2xl bg-pink/10 px-4 py-3 text-center text-[13px] text-pink-accent">
                  {submitError}
                </p>
              )}
            </form>
          </SetupFormCard>
        </div>
      </main>

      <SetupFlowFooter
        hint={
          step === 1
            ? "Something your friends will recognize works best."
            : "Only your nickname shows until the hangout ends."
        }
      >
        {step === 1 ? (
          <Button
            type="button"
            onClick={handleProceedToIdentityStep}
            disabled={isSubmitting}
            className={APP_PRIMARY_BUTTON_CLASS}
          >
            Proceed
          </Button>
        ) : (
          <Button
            type="submit"
            form={CREATE_FORM_ID}
            disabled={isSubmitting}
            className={APP_PRIMARY_BUTTON_CLASS}
          >
            {isSubmitting ? "Creating…" : "Generate link"}
          </Button>
        )}
      </SetupFlowFooter>
    </SetupFlowShell>
  </MobileOnlyAccessGate>
  );
}
