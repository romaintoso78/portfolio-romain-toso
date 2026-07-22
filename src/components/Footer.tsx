import { profile } from "../data/profile";

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-border px-5 py-8 sm:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 font-mono text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} {profile.name}
        </p>
        <p>{profile.location}</p>
      </div>
    </footer>
  );
}
