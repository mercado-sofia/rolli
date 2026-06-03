import { APP_NAME } from "@/lib/constants";

export function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="flex min-h-10 shrink-0 items-center justify-center bg-black px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-5">
      <p className="text-center text-[11px] text-white/90 sm:text-xs">
        © {year} {APP_NAME} · made for real hangouts
      </p>
    </footer>
  );
}
