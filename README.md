# rolli

**A disposable camera night with your friends — except nobody knows who took what until the hangout's over. Then you guess.**

rolli is a little web hangout where everyone joins into the same room, captures photos under anonymous nicknames, and keeps every shot locked away until the hangout ends. When the memories finally develop, the real game begins: who was behind each perspective?

---

## So… what is rolli?

During a hangout, everyone contributes photos like a shared disposable camera — but with a catch:

- **Anonymous nicknames** — you have no idea who's who while you're shooting
- **Hidden photos** — your captures stay sealed until the hangout ends
- **Delayed reveal** — memories develop one perspective at a time, like film coming to life
- **Social deduction** — once everything's out, everyone guesses which friend owned which nickname

---

## Features

| Flow | Description |
|------|-------------|
| **Landing** | Cinematic intro with soft pastel UI |
| **Quick Guide** | Swipeable slides explaining how rolli works |
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

rolli leans into a **soft, pastel, minimalist** look — glassy cards, rounded corners, gentle gradients, and motion that feels more like a film roll than a feed. The vibe is temporary and a little mysterious on purpose. You're not building a profile; you're living a moment.
