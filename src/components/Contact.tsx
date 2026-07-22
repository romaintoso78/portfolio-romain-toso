import { useState, type FormEvent } from "react";
import { Mail } from "lucide-react";
import { GithubIcon, LinkedinIcon } from "./ui/icons";
import { SectionHeading } from "./ui/SectionHeading";
import { Reveal } from "./ui/Reveal";
import { profile } from "../data/profile";

type Status = "idle" | "sending" | "success" | "error";

interface Errors {
  name?: string;
  email?: string;
  message?: string;
}

const FORMSPREE_ENDPOINT = import.meta.env.VITE_FORMSPREE_ENDPOINT as string | undefined;

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>("idle");

  const validate = (): Errors => {
    const next: Errors = {};
    if (!name.trim()) next.name = "Le nom est requis.";
    if (!email.trim()) next.email = "L'adresse email est requise.";
    else if (!isValidEmail(email)) next.email = "L'adresse email est invalide.";
    if (!message.trim()) next.message = "Le message est requis.";
    return next;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    if (!FORMSPREE_ENDPOINT) {
      window.location.href = `mailto:${profile.email}?subject=${encodeURIComponent(
        `Contact portfolio — ${name}`,
      )}&body=${encodeURIComponent(`${message}\n\n${email}`)}`;
      return;
    }

    setStatus("sending");
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      if (res.ok) {
        setStatus("success");
        setName("");
        setEmail("");
        setMessage("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <section id="contact" aria-labelledby="contact-heading" className="px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-3xl">
        <Reveal>
          <SectionHeading eyebrow="Échanger" title="Contact" />
        </Reveal>

        <div className="grid grid-cols-1 gap-10 sm:grid-cols-[1.2fr_1fr]">
          <Reveal>
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <div>
                <label htmlFor="name" className="mb-1.5 block font-mono text-xs uppercase tracking-wide text-muted">
                  Nom
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? "name-error" : undefined}
                  className="w-full rounded border border-border bg-surface px-3.5 py-2.5 text-sm text-text outline-none transition-colors focus:border-accent"
                />
                {errors.name && (
                  <p id="name-error" role="alert" className="mt-1.5 text-xs text-warm">
                    {errors.name}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="mb-1.5 block font-mono text-xs uppercase tracking-wide text-muted">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  className="w-full rounded border border-border bg-surface px-3.5 py-2.5 text-sm text-text outline-none transition-colors focus:border-accent"
                />
                {errors.email && (
                  <p id="email-error" role="alert" className="mt-1.5 text-xs text-warm">
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="message" className="mb-1.5 block font-mono text-xs uppercase tracking-wide text-muted">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  aria-invalid={Boolean(errors.message)}
                  aria-describedby={errors.message ? "message-error" : undefined}
                  className="w-full resize-y rounded border border-border bg-surface px-3.5 py-2.5 text-sm text-text outline-none transition-colors focus:border-accent"
                />
                {errors.message && (
                  <p id="message-error" role="alert" className="mt-1.5 text-xs text-warm">
                    {errors.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={status === "sending"}
                className="inline-flex items-center rounded border border-accent bg-accent/10 px-4 py-2.5 text-sm font-medium text-text transition-colors hover:bg-accent/20 disabled:opacity-60"
              >
                {status === "sending" ? "Envoi en cours…" : "Envoyer le message"}
              </button>

              <div aria-live="polite">
                {status === "success" && (
                  <p className="text-sm text-accent">Message envoyé. Merci, réponse sous peu.</p>
                )}
                {status === "error" && (
                  <p className="text-sm text-warm">
                    L'envoi a échoué. Réessayez, ou écrivez directement à {profile.email}.
                  </p>
                )}
              </div>
            </form>
          </Reveal>

          <Reveal delay={0.05}>
            <div className="space-y-3">
              <a
                href={`mailto:${profile.email}`}
                className="flex items-center gap-3 rounded border border-border px-4 py-3 text-sm text-text transition-colors hover:border-accent"
              >
                <Mail size={16} aria-hidden="true" className="shrink-0 text-muted" />
                <span className="truncate">{profile.email}</span>
              </a>
              <a
                href={profile.github}
                target="_blank"
                rel="noreferrer"
                aria-label="Profil GitHub de Romain Toso"
                className="flex items-center gap-3 rounded border border-border px-4 py-3 text-sm text-text transition-colors hover:border-accent"
              >
                <GithubIcon size={16} className="shrink-0 text-muted" />
                GitHub
              </a>
              <a
                href={profile.linkedin}
                target="_blank"
                rel="noreferrer"
                aria-label="Profil LinkedIn de Romain Toso"
                className="flex items-center gap-3 rounded border border-border px-4 py-3 text-sm text-text transition-colors hover:border-accent"
              >
                <LinkedinIcon size={16} className="shrink-0 text-muted" />
                LinkedIn
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
