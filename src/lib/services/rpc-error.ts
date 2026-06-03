type RpcError = {
  message?: string;
  details?: string;
  code?: string;
};

export function parseRpcError(error: RpcError): string {
  const message = error.message ?? error.details ?? "Something went wrong";

  if (message.includes("Only the Film Keeper can remove participants")) {
    return "Only the Film Keeper can remove someone from the hangout.";
  }

  if (message.includes("You cannot remove yourself from the hangout")) {
    return "You cannot remove yourself. Use Leave room instead.";
  }

  if (message.includes("Participant not found or already removed")) {
    return "That participant is no longer in the room.";
  }

  if (message.includes("Participants cannot be removed in this hangout phase")) {
    return "Participants cannot be removed at this stage.";
  }

  if (message.includes("Participant list is not available for this hangout phase")) {
    return "The participant list is not available right now.";
  }

  if (message.includes("You were removed from this hangout by the Film Keeper")) {
    return "You were removed from this hangout by the Film Keeper.";
  }

  if (message.includes("Only the Film Keeper can abandon the hangout")) {
    return "Only the Film Keeper can abandon the hangout.";
  }

  if (message.includes("Hangout can only be abandoned before it starts")) {
    return "This hangout can no longer be abandoned.";
  }

  if (message.includes("Hangout can only be abandoned before it finishes")) {
    return "This hangout can no longer be abandoned.";
  }

  return message;
}

export function isRemovedByKeeperError(message: string): boolean {
  return message.includes("removed from this hangout by the Film Keeper");
}

export function parseRevealRpcError(error: RpcError): string {
  const message = parseRpcError(error);

  if (
    error.code === "PGRST202" ||
    message.includes("schema cache") ||
    message.includes("Could not find the function")
  ) {
    return "Reveal is not set up on the database yet. Run migrations 007, 013, and 032 in Supabase SQL Editor, then try again.";
  }

  if (message.includes("Only the Film Keeper can continue to guessing")) {
    return "Everyone should be able to continue when they are done viewing. Run migration 032 in Supabase SQL Editor, then try again.";
  }

  if (message.includes("mark_ready_for_guessing")) {
    return "Per-participant reveal ready is not set up yet. Run migration 032 in Supabase SQL Editor, then try again.";
  }

  return message;
}

export function parseGuessingRpcError(error: RpcError): string {
  const message = parseRpcError(error);

  if (message.includes("Guessing is not available yet")) {
    return "Tap Continue to guessing on the reveal screen when you are done viewing the photos.";
  }

  if (
    error.code === "PGRST202" ||
    message.includes("schema cache") ||
    message.includes("Could not find the function")
  ) {
    return "Guessing is not set up on the database yet. Run migrations 008 and 032 in Supabase SQL Editor, then try again.";
  }

  return message;
}

export function parseGalleryRpcError(error: RpcError): string {
  const message = parseRpcError(error);

  if (
    error.code === "PGRST202" ||
    message.includes("schema cache") ||
    message.includes("Could not find the function")
  ) {
    return "Gallery is not set up on the database yet. Run migration 009 in Supabase SQL Editor, then try again.";
  }

  if (message.includes("Gallery is available after the hangout is completed")) {
    return "The memory gallery opens once everyone has finished guessing.";
  }

  return message;
}
