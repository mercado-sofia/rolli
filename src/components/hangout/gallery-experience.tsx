"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { GalleryFolderCard } from "@/components/hangout/gallery-folder-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MobileLoadingSpinner } from "@/components/ui/mobile-loading-spinner";
import {
  APP_PHOTO_GRID_CLASS,
  GALLERY_LOADING_MIN_HEIGHT_CLASS,
  galleryFolderGridClass,
} from "@/lib/app-page-layout";
import { useResignPhotosOnVisibility } from "@/hooks/use-resign-photos-on-visibility";
import {
  downloadPhotosAsZip,
  downloadSinglePhoto,
  getGallery,
  getGalleryParticipantTheme,
  signGalleryPhotoUrls,
} from "@/lib/hangout/gallery";
import type { RevealPerspective } from "@/types/reveal";

type GalleryExperienceProps = {
  hangoutId: string;
  sessionToken: string;
  hangoutTitle: string;
  onLoadingChange?: (loading: boolean) => void;
};

export function GalleryExperience({
  hangoutId,
  sessionToken,
  hangoutTitle,
  onLoadingChange,
}: GalleryExperienceProps) {
  const [perspectives, setPerspectives] = useState<RevealPerspective[]>([]);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [signedAt, setSignedAt] = useState<number | null>(null);

  const retryLoad = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  const resignPhotos = useCallback(async () => {
    const { data, error } = await getGallery(hangoutId, sessionToken);
    if (error || !data) return;

    const signed = await signGalleryPhotoUrls(data.perspectives);
    setPerspectives(signed);
    setSignedAt(Date.now());
  }, [hangoutId, sessionToken]);

  useResignPhotosOnVisibility({
    signedAt,
    onResign: resignPhotos,
    enabled: !loading && perspectives.length > 0,
  });

  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadError(null);
      setLoading(true);

      const { data, error } = await getGallery(hangoutId, sessionToken);
      if (cancelled) return;

      if (error || !data) {
        setPerspectives([]);
        setSignedAt(null);
        setLoadError(error ?? "Could not load gallery");
        setLoading(false);
        return;
      }

      const signed = await signGalleryPhotoUrls(data.perspectives);
      if (cancelled) return;

      setPerspectives(signed);
      setSignedAt(Date.now());
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [hangoutId, reloadKey, sessionToken]);

  const activeParticipantId = useMemo(() => {
    if (perspectives.length === 0) return null;
    if (
      selectedParticipantId &&
      perspectives.some((p) => p.participantId === selectedParticipantId)
    ) {
      return selectedParticipantId;
    }
    return perspectives[0]?.participantId ?? null;
  }, [perspectives, selectedParticipantId]);

  const selectedPerspective = useMemo(
    () => perspectives.find((p) => p.participantId === activeParticipantId) ?? null,
    [perspectives, activeParticipantId],
  );

  const visiblePhotos = useMemo(() => {
    if (!selectedPerspective) return [];

    return selectedPerspective.photos
      .filter((photo) => photo.signedUrl)
      .map((photo, index) => ({
        id: photo.id,
        url: photo.signedUrl!,
        fileName:
          photo.fileName ?? `${selectedPerspective.nickname}-${index + 1}.jpg`,
        nickname: selectedPerspective.nickname,
      }));
  }, [selectedPerspective]);

  const folderCards = useMemo(() => {
    let nonHostColorIndex = 0;

    return perspectives.map((perspective) => {
      const theme = perspective.isFilmKeeper
        ? getGalleryParticipantTheme(0, true)
        : getGalleryParticipantTheme(nonHostColorIndex++, false);

      return { perspective, theme };
    });
  }, [perspectives]);

  const totalPhotos = perspectives.reduce(
    (sum, perspective) => sum + perspective.photos.length,
    0,
  );

  const useCompactFolderCards = folderCards.length >= 3;

  async function handleDownloadPack(
    packId: string,
    zipName: string,
    photos: { url: string; fileName: string }[],
  ) {
    setDownloading(packId);
    setDownloadError(null);

    try {
      await downloadPhotosAsZip(zipName, photos);
    } catch (error) {
      setDownloadError(
        error instanceof Error ? error.message : "Download failed",
      );
    } finally {
      setDownloading(null);
    }
  }

  async function handleDownloadSingle(
    photoId: string,
    url: string,
    fileName: string,
  ) {
    setDownloading(photoId);
    setDownloadError(null);

    try {
      await downloadSinglePhoto(url, fileName);
    } catch (error) {
      setDownloadError(
        error instanceof Error ? error.message : "Download failed",
      );
    } finally {
      setDownloading(null);
    }
  }

  if (loading) {
    return (
      <MobileLoadingSpinner inline className={GALLERY_LOADING_MIN_HEIGHT_CLASS} />
    );
  }

  if (loadError) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-pink">{loadError}</p>
        <Button type="button" variant="secondary" onClick={retryLoad}>
          Try again
        </Button>
      </div>
    );
  }

  const allDownloadable = perspectives.flatMap((perspective) =>
    perspective.photos
      .filter((photo) => photo.signedUrl)
      .map((photo) => ({
        url: photo.signedUrl!,
        fileName: photo.fileName ?? `${perspective.nickname}.jpg`,
      })),
  );

  return (
    <div className="space-y-6">
      <Card border="neutral" className="text-center">
        <p className="text-sm text-muted">
          {totalPhotos} {totalPhotos === 1 ? "memory" : "memories"} from{" "}
          {perspectives.length}{" "}
          {perspectives.length === 1 ? "perspective" : "perspectives"}
        </p>
      </Card>

      <div className={galleryFolderGridClass(folderCards.length)}>
        {folderCards.map(({ perspective, theme }) => (
          <GalleryFolderCard
            key={perspective.participantId}
            nickname={perspective.nickname}
            realName={perspective.realName}
            theme={theme}
            compact={useCompactFolderCards}
            selected={activeParticipantId === perspective.participantId}
            onSelect={() => setSelectedParticipantId(perspective.participantId)}
          />
        ))}
      </div>

      <Card border="neutral" className="space-y-3">
        <p className="text-sm font-medium text-ink">Download</p>
        {downloadError && (
          <p className="text-sm text-pink">{downloadError}</p>
        )}
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={allDownloadable.length === 0 || Boolean(downloading)}
            onClick={() =>
              void handleDownloadPack(
                "full-album",
                `${hangoutTitle}-full-album`,
                allDownloadable,
              )
            }
          >
            {downloading === "full-album"
              ? "Preparing zip…"
              : "Download full album (zip)"}
          </Button>
          {selectedPerspective && visiblePhotos.length > 0 && (
            <Button
              type="button"
              variant="secondary"
              disabled={Boolean(downloading)}
              onClick={() =>
                void handleDownloadPack(
                  `perspective-${selectedPerspective.participantId}`,
                  `${hangoutTitle}-${selectedPerspective.nickname}`,
                  visiblePhotos.map((photo) => ({
                    url: photo.url,
                    fileName: photo.fileName,
                  })),
                )
              }
            >
              {downloading === `perspective-${selectedPerspective.participantId}`
                ? "Preparing zip…"
                : `Download ${selectedPerspective.nickname}'s folder (zip)`}
            </Button>
          )}
        </div>
      </Card>

      {!selectedPerspective || visiblePhotos.length === 0 ? (
        <Card border="neutral" className="text-center text-sm text-muted">
          No photos in this folder.
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-center text-sm text-muted">
            {selectedPerspective.nickname}&apos;s memories
          </p>
          <div className={APP_PHOTO_GRID_CLASS}>
            {selectedPerspective.photos.map((photo, index) => (
              <div
                key={photo.id}
                className="relative aspect-3/4 overflow-hidden rounded-2xl bg-[#F8F8F8]"
              >
                {photo.signedUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo.signedUrl}
                    alt={`${selectedPerspective.nickname} memory ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted">
                    Unavailable
                  </div>
                )}
                {photo.signedUrl && (
                  <button
                    type="button"
                    className="absolute bottom-2 right-2 inline-flex min-h-10 min-w-14 items-center justify-center rounded-full bg-ink/80 px-4 py-2 text-sm text-white"
                    disabled={downloading === photo.id}
                    onClick={() =>
                      void handleDownloadSingle(
                        photo.id,
                        photo.signedUrl!,
                        photo.fileName ??
                          `${selectedPerspective.nickname}-${index + 1}.jpg`,
                      )
                    }
                  >
                    {downloading === photo.id ? "…" : "Save"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
