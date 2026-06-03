# Rolli

**A temporary anonymous disposable camera and social deduction experience for friend groups.**

Rolli is a web-based hangout experience where friends join a shared room, capture photos anonymously using nicknames, and reveal every memory only after the hangout ends. The final twist: guess which real person belongs to each anonymous perspective.

---

## What is Rolli?

During a hangout, everyone contributes photos like a shared disposable camera — but with a catch:

- **Anonymous nicknames** — no one knows who is who during the session
- **Hidden photos** — captures stay locked until the hangout ends
- **Delayed reveal** — memories develop cinematically, grouped by perspective
- **Social deduction** — after the reveal, everyone guesses who owned each nickname

The experience is designed to feel **nostalgic, intimate, cinematic, and playful** — not like social media. No likes, comments, followers, or live galleries.

---

## Features

| Flow | Description |
|------|-------------|
| **Landing** | Cinematic intro with soft pastel UI |
| **Quick Guide** | Swipeable slides explaining how Rolli works |
| **Create / Join** | Start a hangout or paste an invitation link |
| **Waiting Room** | Anonymous hold — only participant count is visible |
| **Share** | Copy or share the invitation link from the waiting room |
| **Hangout Menu** | Nickname roster; Film Keeper can remove a guest |
| **Active Session** | Capture memories (max 10 per user) with no previews |
| **Developing & Reveal** | Developing overlay, then perspective-by-perspective unlock |
| **Guessing** | Private votes to match nicknames to real names; hangout-wide vote progress |
| **Gallery** | Final memory grid with participant labels and download options |

### Roles & rules (high level)

- **Film Keeper** — the room creator; starts and ends the hangout, controls reveal, and can remove guests
- **Film Keeper transfer** — if the Keeper leaves, host duties pass to the next guest
- **Abandon** — Film Keeper can cancel a hangout still in the waiting room
- **Max 10 participants** per room
- **2–10 participants** required to start (Film Keeper cannot start alone)
- **Mid-session join** — new guests can join while the hangout is still in progress; returning participants rejoin with their saved session
- **Ready for guessing** — each guest marks when they are done viewing; guessing opens once everyone is ready
- **Auto-end** — active sessions end automatically after 24 hours if no one ends them manually
- **Temporary by design** — hangouts and photos are not kept forever

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | [Next.js](https://nextjs.org) (App Router), [React](https://react.dev), [TypeScript](https://www.typescriptlang.org) |
| Styling | [Tailwind CSS](https://tailwindcss.com) |
| Forms & validation | [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev) |
| State | [Zustand](https://zustand.docs.pmnd.rs) |
| Animation | [Framer Motion](https://www.framer.com/motion) |
| Icons | [Lucide React](https://lucide.dev), [React Icons](https://react-icons.github.io/react-icons/) |
| Backend | [Supabase](https://supabase.com) — PostgreSQL + Storage |

---

## Design direction

Rolli uses a **soft, pastel, minimalist** aesthetic — glassmorphism, rounded cards, gentle gradients, and cinematic motion. The goal is an emotionally engaging experience that feels temporary and mysterious, not feed-driven.