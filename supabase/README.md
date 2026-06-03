# Rolli — Supabase setup

Database migrations and Supabase CLI config for the Rolli app. This folder lives alongside the Next.js app in `rolli/`.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a project.
2. Copy **Project URL** and **anon public key** from **Settings → API**.

## 2. Run migrations

In the Supabase Dashboard, open **SQL Editor** and run each file **in order**:

| Order | File |
|-------|------|
| 1 | `migrations/001_initial_schema.sql` |
| 2 | `migrations/002_rls_and_grants.sql` |
| 3 | `migrations/003_rpc_functions.sql` |
| 4 | `migrations/004_storage.sql` |
| 5 | `migrations/005_random_hangout_slug.sql` |
| 6 | `migrations/006_photo_capture.sql` |
| 7 | `migrations/007_reveal_flow.sql` |
| 8 | `migrations/008_guessing.sql` |
| 9 | `migrations/009_gallery.sql` |
| 10 | `migrations/010_auto_end_hangout.sql` |
| 11 | `migrations/011_guessing_and_start_rules_hardening.sql` |
| 12 | `migrations/012_fix_photo_upload_storage_rls.sql` |
| 13 | `migrations/013_ensure_reveal_rpcs.sql` (run if reveal RPCs are missing) |
| 14 | `migrations/014_leave_rejoin_and_join_rules.sql` |
| 15 | `migrations/015_enable_hangout_realtime.sql` |
| 16 | `migrations/016_hardening_misc.sql` |
| 17 | `migrations/017_abandon_hangout.sql` |
| 18 | `migrations/018_abandon_hangout_rpc.sql` |
| 19 | `migrations/019_allow_join_after_start.sql` |
| 20 | `migrations/020_transfer_film_keeper_on_leave.sql` |
| 21 | `migrations/021_reveal_countdown.sql` |
| 22 | `migrations/022_reveal_preload_during_countdown.sql` |
| 23 | `migrations/023_reveal_preload_storage_read.sql` |
| 24 | `migrations/024_nickname_min_length.sql` |
| 25 | `migrations/025_remove_reveal_countdown.sql` |
| 26 | `migrations/026_reveal_preload_during_developing.sql` |
| 27 | `migrations/027_gallery_participant_details.sql` |
| 28 | `migrations/028_gallery_open_for_all_participants.sql` |
| 29 | `migrations/029_guessing_global_vote_progress.sql` |
| 30 | `migrations/030_block_join_after_hangout_end.sql` |
| 31 | `migrations/031_security_and_hardening.sql` |
| 32 | `migrations/032_per_participant_reveal_ready.sql` |
| 33 | `migrations/033_hangout_roster_and_keeper_kick.sql` |
| 34 | `migrations/034_participant_removed_by_keeper.sql` |
| 35 | `migrations/035_kicked_rejoin_and_nickname.sql` |
| 36 | `migrations/036_hangout_retention_purge.sql` |
| 37 | `migrations/037_abandon_during_active.sql` |
| 38 | `migrations/038_hangout_retention_3_days.sql` |

**Migration overrides:** `003_rpc_functions.sql` is the historical baseline. Later files replace key RPCs — especially **005** (slug), **011** (start rules), **012** (storage RLS), **013** (reveal), **014** (leave/rejoin/join), **016** (`end_hangout`, slot cleanup), **018** (`abandon_hangout`), **019** (`join_hangout` / `rejoin_hangout` — guests can join while active), **020** (`transfer_film_keeper`, `leave_hangout` keeper handoff, keeper RPCs use `film_keeper_id`), **021–023** (synced reveal countdown + preload — superseded by **025–026**), **024** (2-character nicknames), **025** (removes server countdown; countdown is client-side only), **026** (`signal_reveal_pending`, `reveal_pending_at`, preload after signal), **027** (gallery payload includes participant identity), **028** (`maybe_complete_guessing_if_ready`, any participant may call `finish_guessing` once all votes are in), **029** (`get_guessing_state` exposes hangout-wide vote progress), **030** (block new guests once the hangout leaves the in-progress join window — superseded by **035** for `revealing`/`guessing`), **031** (security hardening: revoke public `transfer_film_keeper`, gate photo reads until `reveal_pending_at`, grant `signal_reveal_pending`, fix guessing completion when participants leave, block inactive-nickname rejoin via join, RPC rate limits), **032** (per-participant reveal ready; early guessing while `revealing`), **033** (`get_hangout_participants` nickname roster; `remove_participant_by_keeper` for Film Keeper kick), **034** (`removed_by_keeper_at`, `get_participant_session_status`, block rejoin after kick), **035** (partial unique nickname for active participants only; kicked guests may `join_hangout` as a new row with same nickname; join allowed through `guessing`), **036** (retention purge: `purge_stale_hangouts`, storage cleanup, optional cron), **037** (`abandon_hangout` allowed in `waiting` and `active`), **038** (retention window 3 days via `hangout_purge_retention_days`).

Or with the [Supabase CLI](https://supabase.com/docs/guides/cli), from the **`rolli/`** directory (parent of this folder):

```bash
cd rolli
supabase link --project-ref <your-project-ref>
supabase db push
```

## 3. Configure the Next.js app

From `rolli/`, create `.env.local` and add your Supabase keys:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For production (Vercel), set the same variables in the project dashboard. Use your live URL for `NEXT_PUBLIC_APP_URL` (e.g. `https://rolli.vercel.app`).

Restart `npm run dev` after changing env vars locally.

## 4. Storage

Migration `004_storage.sql` creates a private bucket `hangout-photos`. Migration `006_photo_capture.sql` adds upload slots, capture RPCs, and storage policies for the camera feature.

### Storage CORS (gallery downloads)

Bulk ZIP and single-photo downloads in the app use `fetch()` on signed Storage URLs. Configure CORS on the **`hangout-photos`** bucket or downloads fail in the browser.

1. Supabase Dashboard → **Storage** → **hangout-photos** → **Configuration** → **CORS**
2. Allow `GET` from your app origins, for example:

```json
[
  {
    "origin": ["http://localhost:3000", "https://your-production-domain.com"],
    "method": ["GET"],
    "headers": ["*"],
    "maxAgeSeconds": 3600
  }
]
```

Use the same host as `NEXT_PUBLIC_APP_URL` in production. After updating CORS, test **Download all** and a single photo from the memory gallery.

## 5. Auto-end after 24 hours

Migration `010_auto_end_hangout.sql` ends active hangouts automatically when `started_at` is more than 24 hours ago (same as Film Keeper tapping **Develop Memories** → status `developing`).

- **On every poll:** `get_hangout_public` checks and auto-ends that hangout if expired (works with the app’s 2s sync).
- **Realtime:** migration **015** adds `hangouts` to the `supabase_realtime` publication for instant status updates; polling remains as fallback.
- **Optional background jobs:** enable the `pg_cron` extension in **Database → Extensions**, then schedule jobs in the SQL Editor. Do not enable cron unless you want background maintenance.
  - Auto-end expired hangouts every 15 minutes — SQL at the bottom of `010_auto_end_hangout.sql`.
  - Clean up expired photo upload slots — `cleanup_expired_photo_upload_slots()` from `016_hardening_misc.sql` (schedule as needed).
  - Purge hangouts older than the retention window — `purge_stale_hangouts()` from `036_hangout_retention_purge.sql` (see §6).

## 6. Data retention (3 days)

Migrations `036_hangout_retention_purge.sql` and `038_hangout_retention_3_days.sql` remove eligible hangouts and their files in `hangout-photos`. Child rows (`participants`, `photos`, `votes`, `photo_upload_slots`) are removed via `ON DELETE CASCADE`.

| Status | Purged when |
|--------|-------------|
| `completed`, `cancelled` | `updated_at` is more than 3 days ago |
| `waiting` | `created_at` is more than 3 days ago (abandoned lobby) |
| `developing`, `revealing`, `guessing`, `active` | Last activity timestamp (`ended_at`, `started_at`, etc.) is more than 3 days ago |

**Not callable from the app** — only `postgres` / `service_role` (same pattern as `auto_end_expired_hangouts` after **031**).

1. Run migrations **036** and **038** in the SQL Editor (or `supabase db push`).
2. Enable **pg_cron** (Database → Extensions) if you want automatic cleanup.
3. Schedule a daily job (example runs at 03:00 UTC, up to 50 hangouts per run):

```sql
SELECT cron.schedule(
  'rolli-purge-stale-hangouts',
  '0 3 * * *',
  $$ SELECT public.purge_stale_hangouts(50); $$
);
```

4. **One-off test** (SQL Editor):

```sql
SELECT public.purge_stale_hangouts(10);
```

Returns JSON, e.g. `{"hangouts_deleted": 2, "storage_objects_deleted": 14, "retention_days": 3}`.

To change the window, replace `hangout_purge_retention_days()` in a follow-up migration and keep `HANGOUT_LIMITS.retentionDays` in `src/lib/constants.ts` in sync for UI copy.

## Abandon hangout (017–018, 037)

- Migration **017** adds hangout status `cancelled`.
- **`abandon_hangout`** (018, updated in **037**) — Film Keeper only; allowed while status is `waiting` or `active`. Sets status to `cancelled` and blocks new joins. All participants are redirected via Realtime status sync.

## Film Keeper transfer (020, 031)

- **`transfer_film_keeper`** — when the current Film Keeper leaves and other active participants remain, host duties pass to the next active guest (`joined_at` ASC). Migration **031** revokes direct client execute on this RPC; it is internal-only via **`leave_hangout`**.
- Keeper-gated RPCs (`start_hangout`, `end_hangout`, `start_reveal`, `abandon_hangout`) authorize via `participants.id = hangouts.film_keeper_id`.
- Migration **032** — **`mark_ready_for_guessing`** (any participant) sets `reveal_finished_at` and moves the hangout to `guessing` only when every active participant is ready; early finishers can guess while status is still `revealing`.
- Solo Film Keeper in `waiting` still cannot leave (use **Abandon**). Solo active session can leave with no successor until someone rejoins or 24h auto-end.

## Leave / rejoin / join (014, 019, 020, 030, 031, 035)

- **`leave_hangout`** — marks participant inactive; transfers Film Keeper first when others are in the room (see **020**). Solo Keeper in `waiting` cannot leave.
- **`rejoin_hangout`** — reactivates a participant who left voluntarily, using the same `session_token`. Allowed for any status except `completed` and `cancelled` (subject to the 10-participant cap). **Blocked after a Film Keeper kick** (**034**).
- **`join_hangout`** — creates a **new** participant row. Allowed while status is `waiting`, `active`, `revealing`, or `guessing` (**035**). Active nicknames must be unique; a kicked guest may reuse their nickname because only **active** rows are unique (**035**). Voluntary leavers should use **`rejoin_hangout`** with a saved session token instead of joining again.

If a user clears browser storage without leaving, they cannot recover their session (MVP limitation).

## Film Keeper roster & kick (033–034)

- **`get_hangout_participants`** — nickname-only roster for the hangout menu (`waiting`, `active`, `revealing`, `guessing`). During `revealing`/`guessing`, includes ready-for-guessing chips when applicable.
- **`remove_participant_by_keeper`** — Film Keeper deactivates a guest and sets `removed_by_keeper_at`. Kicked guests see a dedicated screen and may **`join_hangout`** again as a new participant (**035**); their old session token cannot **`rejoin_hangout`** (**034**).
- **`get_participant_session_status`** — polled by the app to detect keeper removal without Realtime on `participants`.

## Reveal flow (025–026)

- **Developing and revealing** both live on the app route `/h/[slug]/reveal`. The old `/developing` route redirects there.
- Migration **025** removes the server-synced countdown (`reveal_countdown_at`, `begin_reveal_countdown`). The 3-second countdown before photos appear runs **client-side only**.
- Migration **026** adds **`signal_reveal_pending`** and `reveal_pending_at`. The Film Keeper taps **Start reveal** → clients preload → **`start_reveal`** moves the hangout to `revealing`. Migration **031** gates storage reads and **`get_reveal_state`** until `reveal_pending_at` is set during `developing`.

## Security hardening (031)

- Revokes public execute on **`transfer_film_keeper`** and maintenance RPCs (`auto_end_*`, `cleanup_expired_photo_upload_slots`, `purge_stale_hangouts`, `generate_hangout_slug`).
- Grants execute on **`signal_reveal_pending`** to `anon` / `authenticated`.
- **`maybe_complete_guessing_if_ready`** requires every **active** participant to submit all required votes (fixes early completion when someone leaves).
- **`assert_rate_limit`** on `create_hangout_with_keeper`, `join_hangout`, `get_hangout_public`, and `prepare_photo_upload`.

## Per-participant reveal ready (032)

- **`mark_ready_for_guessing`** — any active participant marks themselves done viewing; early finishers can vote while the hangout is still `revealing`.
- Hangout moves to **`guessing`** only when every active participant has `reveal_finished_at` set.
- In-flight hangouts already in `guessing` / `completed` are backfilled on migrate.

## Guessing & gallery completion (027–029)

- Migration **027** — `get_gallery` includes participant nicknames and real names (only after status is `completed`).
- Migration **028** — **`maybe_complete_guessing_if_ready`** auto-completes the hangout when every expected vote is submitted. **`finish_guessing`** is available to **any active participant** (not Film Keeper only) once all votes are in; the gallery opens after completion.
- Migration **029** — **`get_guessing_state`** returns hangout-wide `total_votes_required`, `total_votes_submitted`, and `all_participants_voted` so the UI does not advance early when only one player has finished.

## Verify migrations (optional)

Run in the SQL Editor after applying **001–035**:

```sql
-- Core RPCs should exist
SELECT proname FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND proname IN (
    'join_hangout', 'rejoin_hangout', 'leave_hangout',
    'abandon_hangout', 'end_hangout', 'get_hangout_public',
    'transfer_film_keeper', 'signal_reveal_pending',
    'maybe_complete_guessing_if_ready', 'get_guessing_state',
    'get_hangout_participants', 'remove_participant_by_keeper',
    'get_participant_session_status'
  )
ORDER BY proname;

-- Realtime publication includes hangouts (after 015)
SELECT tablename FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND tablename = 'hangouts';
```

## Schema overview

- **hangouts** — room metadata, status (`waiting` through `completed`, plus `cancelled`), Film Keeper reference, optional `reveal_pending_at`
- **participants** — anonymous nicknames, hidden real names, session tokens
- **photos** — storage paths (files in `hangout-photos` bucket)
- **votes** — private guessing phase answers

Sensitive operations use **SECURITY DEFINER** RPC functions so the anon key never exposes raw tables directly.

## Folder layout note

```text
rolli/
├── supabase/          ← you are here (migrations, this README)
├── src/lib/supabase/  ← Next.js Supabase client code (different folder)
└── .env.local         ← app environment variables
```
