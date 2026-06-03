"use client";

import { useEffect } from "react";
import { useFormStatus } from "react-dom";

type FormSubmittingBridgeProps = {
  onSubmittingChange: (isSubmitting: boolean) => void;
};

/** Reports form pending state to a parent (e.g. external submit button). Must render inside <form>. */
export function FormSubmittingBridge({
  onSubmittingChange,
}: FormSubmittingBridgeProps) {
  const { pending } = useFormStatus();

  useEffect(() => {
    onSubmittingChange(pending);
  }, [pending, onSubmittingChange]);

  return null;
}
