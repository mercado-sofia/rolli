-- Rolli: Storage bucket for hangout photos
-- Upload/download policies will be added when the camera feature is implemented.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hangout-photos',
  'hangout-photos',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;
