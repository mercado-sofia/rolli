"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";

import { usePreventAutoKeyboard } from "@/hooks/use-prevent-auto-keyboard";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Field } from "@/components/ui/field";
import { FormCallout } from "@/components/ui/form-callout";
import { SetupFormCard } from "@/components/ui/setup-form-card";
import { NICKNAME_MIN_LENGTH } from "@/lib/constants";
import { joinHangout } from "@/lib/hangout/hangout-api";
import {
  buildInviteUrl,
  extractSlugFromInviteLink,
  inferWaitingReturnPathFromJoin,
  setWaitingReturnPath,
} from "@/lib/hangout/join";
import { hangoutParticipantPath } from "@/lib/hangout/routes";
import { useSessionStore } from "@/store/session-store";

const baseJoinSchema = z.object({
  inviteLink: z.string().optional(),
  nickname: z
    .string()
    .trim()
    .min(
      NICKNAME_MIN_LENGTH,
      `Nickname must be at least ${NICKNAME_MIN_LENGTH} characters`,
    ),
  realName: z.string().min(2, "Enter your real name (hidden until reveal)"),
});

const pasteLinkJoinSchema = baseJoinSchema.extend({
  inviteLink: z.string().min(3, "Paste your invitation link"),
});

type JoinFormValues = z.infer<typeof baseJoinSchema>;

type JoinHangoutFormProps = {
  slug?: string;
  hangoutTitle?: string;
  showInviteLinkField?: boolean;
  /** When pasting a link, step 1 = link only, step 2 = identity only. */
  step?: 1 | 2;
  formId?: string;
  onSubmittingChange?: (isSubmitting: boolean) => void;
};

export type JoinHangoutFormHandle = {
  /** Resolves the slug from the pasted link; returns null when invalid. */
  validateLinkStep: () => Promise<string | null>;
  setInviteLinkError: (message: string) => void;
};

export const JoinHangoutForm = forwardRef<
  JoinHangoutFormHandle,
  JoinHangoutFormProps
>(function JoinHangoutForm(
  {
    slug: slugFromUrl,
    hangoutTitle,
    showInviteLinkField = false,
    step = 1,
    formId = "join-hangout-form",
    onSubmittingChange,
  },
  ref,
) {
  const router = useRouter();
  const setSession = useSessionStore((state) => state.setSession);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    onSubmittingChange?.(isJoining);
  }, [isJoining, onSubmittingChange]);

  const schema = showInviteLinkField ? pasteLinkJoinSchema : baseJoinSchema;

  const defaultInviteLink = useMemo(
    () => (slugFromUrl ? buildInviteUrl(slugFromUrl) : ""),
    [slugFromUrl],
  );

  const {
    register,
    handleSubmit,
    trigger,
    setError,
    getValues,
    formState: { errors },
  } = useForm<JoinFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      inviteLink: defaultInviteLink,
      nickname: "",
      realName: "",
    },
  });

  useImperativeHandle(ref, () => ({
    async validateLinkStep() {
      const isValid = await trigger("inviteLink");
      if (!isValid) return null;

      const slug =
        slugFromUrl ?? extractSlugFromInviteLink(getValues("inviteLink") ?? "");
      if (!slug) {
        setError("inviteLink", { message: "Invalid invitation link" });
        return null;
      }

      return slug;
    },
    setInviteLinkError(message: string) {
      setError("inviteLink", { message });
    },
  }));

  const showLinkStep = showInviteLinkField && step === 1;
  const showIdentityStep = !showInviteLinkField || step === 2;

  usePreventAutoKeyboard(showIdentityStep);

  async function onSubmit(values: JoinFormValues) {
    setSubmitError(null);

    const slug =
      slugFromUrl ?? extractSlugFromInviteLink(values.inviteLink ?? "");

    if (!slug) {
      setSubmitError("Invalid invitation link");
      if (showInviteLinkField) {
        setError("inviteLink", { message: "Invalid invitation link" });
      }
      return;
    }

    setIsJoining(true);

    const { data, error } = await joinHangout({
      slug,
      nickname: values.nickname,
      realName: values.realName,
    });

    if (error || !data) {
      setIsJoining(false);
      const message = error ?? "Could not join hangout";
      setSubmitError(message);
      if (showInviteLinkField) {
        setError("inviteLink", { message });
      }
      return;
    }

    setSession(data.hangout, data.participant);
    if (data.hangout.status === "waiting") {
      setWaitingReturnPath(
        slug,
        inferWaitingReturnPathFromJoin(slug, slugFromUrl),
      );
    }
    router.push(hangoutParticipantPath(slug, data.hangout.status));
  }

  return (
    <SetupFormCard>
      <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {hangoutTitle && (
          <FormCallout>
            You&apos;re joining{" "}
            <span className="font-medium text-ink">{hangoutTitle}</span>
          </FormCallout>
        )}

        {showLinkStep && (
          <Field
            id="inviteLink"
            label="Invitation link"
            placeholder="rolli.app/h/a3f9c2b1e8d4"
            error={errors.inviteLink?.message}
            readOnly={Boolean(slugFromUrl)}
            {...register("inviteLink")}
          />
        )}

        {showIdentityStep && (
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
  );
});
