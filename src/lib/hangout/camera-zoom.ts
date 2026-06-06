export type ZoomRange = {
  min: number;
  max: number;
  step: number;
};

export type ZoomPreset = {
  label: string;
  value: number;
};

const ZOOM_CANDIDATES: Array<{ label: string; value: number }> = [
  { label: "0.5×", value: 0.5 },
  { label: "1×", value: 1 },
  { label: "2×", value: 2 },
  { label: "5×", value: 5 },
];

const DEFAULT_ZOOM_STEP = 0.1;
const ZOOM_VALUE_EPSILON = 0.001;

type ZoomMediaTrackSettings = MediaTrackSettings & {
  zoom?: number;
};

function snapZoomValue(value: number, step: number): number {
  if (!Number.isFinite(step) || step <= 0) {
    return value;
  }
  return Math.round(value / step) * step;
}

function clampZoomValue(value: number, range: ZoomRange): number {
  const snapped = snapZoomValue(value, range.step);
  return Math.min(range.max, Math.max(range.min, snapped));
}

export function readZoomCapabilities(
  track: MediaStreamTrack,
): ZoomRange | null {
  const capabilities = track.getCapabilities?.();
  if (!capabilities || !("zoom" in capabilities)) {
    return null;
  }

  const zoom = capabilities.zoom as
    | { min?: number; max?: number; step?: number }
    | undefined;
  if (
    zoom?.min === undefined ||
    zoom.max === undefined ||
    !Number.isFinite(zoom.min) ||
    !Number.isFinite(zoom.max) ||
    zoom.max <= zoom.min
  ) {
    return null;
  }

  const step =
    zoom.step !== undefined && Number.isFinite(zoom.step) && zoom.step > 0
      ? zoom.step
      : DEFAULT_ZOOM_STEP;

  return { min: zoom.min, max: zoom.max, step };
}

export function buildZoomPresets(range: ZoomRange): ZoomPreset[] {
  const presets: ZoomPreset[] = [];
  const seen = new Set<string>();

  for (const candidate of ZOOM_CANDIDATES) {
    if (candidate.value < range.min - ZOOM_VALUE_EPSILON) continue;
    if (candidate.value > range.max + ZOOM_VALUE_EPSILON) continue;

    const value = clampZoomValue(candidate.value, range);
    const key = value.toFixed(4);
    if (seen.has(key)) continue;

    seen.add(key);
    presets.push({ label: candidate.label, value });
  }

  if (presets.length === 0) {
    const fallback =
      range.min <= 1 && 1 <= range.max
        ? clampZoomValue(1, range)
        : clampZoomValue(range.min, range);
    presets.push({
      label: fallback === range.min && range.min < 1 ? "0.5×" : "1×",
      value: fallback,
    });
  }

  return presets.sort((a, b) => a.value - b.value);
}

export function getDefaultZoomPreset(presets: ZoomPreset[]): ZoomPreset | null {
  if (presets.length === 0) return null;

  const labeledOneX = presets.find((preset) => preset.label === "1×");
  if (labeledOneX) return labeledOneX;

  const valueNearOne = presets.find(
    (preset) => Math.abs(preset.value - 1) < ZOOM_VALUE_EPSILON,
  );
  if (valueNearOne) return valueNearOne;

  return presets.reduce((nearest, preset) =>
    Math.abs(preset.value - 1) < Math.abs(nearest.value - 1) ? preset : nearest,
  );
}

export function getActiveZoomValue(
  track: MediaStreamTrack,
  presets: ZoomPreset[],
): number {
  if (presets.length === 0) return 1;

  const settings = track.getSettings?.() as ZoomMediaTrackSettings | undefined;
  const current = settings?.zoom;
  const raw =
    typeof current === "number" && Number.isFinite(current)
      ? current
      : (getDefaultZoomPreset(presets)?.value ?? 1);

  return snapToNearestPreset(raw, presets).value;
}

export async function resetVideoTrackToDefaultZoom(
  track: MediaStreamTrack,
  range: ZoomRange,
  presets: ZoomPreset[],
): Promise<number | null> {
  const defaultPreset = getDefaultZoomPreset(presets);
  if (!defaultPreset) return null;

  return applyVideoTrackZoom(track, defaultPreset.value, range);
}

function snapToNearestPreset(value: number, presets: ZoomPreset[]): ZoomPreset {
  return presets.reduce((nearest, preset) =>
    Math.abs(preset.value - value) < Math.abs(nearest.value - value)
      ? preset
      : nearest,
  );
}

export async function applyVideoTrackZoom(
  track: MediaStreamTrack,
  value: number,
  range: ZoomRange,
): Promise<number> {
  const zoom = clampZoomValue(value, range);

  await track.applyConstraints({
    advanced: [{ zoom } as MediaTrackConstraintSet],
  });

  return zoom;
}

export function isZoomPresetActive(
  activeZoom: number | null,
  presetValue: number,
): boolean {
  if (activeZoom === null) return false;
  return Math.abs(activeZoom - presetValue) < ZOOM_VALUE_EPSILON;
}
