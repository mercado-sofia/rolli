type CaptureOverlayHintInput = {
  isTouchPrimary: boolean;
  hasZoomControls: boolean;
};

export function getCaptureOverlayHint({
  isTouchPrimary,
  hasZoomControls,
}: CaptureOverlayHintInput): string {
  if (isTouchPrimary) {
    if (hasZoomControls) {
      return "Tap the shutter to capture · Tap a zoom level to adjust · Back closes the camera";
    }
    return "Tap the shutter to capture · Back closes the camera";
  }

  if (hasZoomControls) {
    return "Click the shutter to capture · Choose a zoom level if needed · Back or Esc closes the camera";
  }

  return "Click the shutter to capture · Back or Esc closes the camera";
}
