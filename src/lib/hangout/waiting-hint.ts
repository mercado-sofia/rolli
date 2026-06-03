export function getWaitingHint(
  isFilmKeeper: boolean,
  canStart: boolean,
): string | undefined {
  if (!isFilmKeeper) {
    return "Waiting for the Film Keeper to start the hangout…";
  }

  if (canStart) {
    return "Everyone's here — start when you're ready.";
  }

  return undefined;
}
