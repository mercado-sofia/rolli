const DEFAULT_MAX_EDGE = 1600;
const DEFAULT_JPEG_QUALITY = 0.85;

export function encodeVideoFrameToJpeg(
  video: HTMLVideoElement,
  maxEdge = DEFAULT_MAX_EDGE,
  quality = DEFAULT_JPEG_QUALITY,
): Promise<Blob> {
  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;

  if (!sourceWidth || !sourceHeight) {
    return Promise.reject(new Error("Camera not ready"));
  }

  const longest = Math.max(sourceWidth, sourceHeight);
  const scale = longest > maxEdge ? maxEdge / longest : 1;
  const width = Math.round(sourceWidth * scale);
  const height = Math.round(sourceHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    return Promise.reject(new Error("Could not capture frame"));
  }

  context.drawImage(video, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error("Could not encode photo"));
      },
      "image/jpeg",
      quality,
    );
  });
}

export const CAMERA_VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: { ideal: "environment" },
  width: { ideal: 1280, max: 1920 },
  height: { ideal: 720, max: 1080 },
};
