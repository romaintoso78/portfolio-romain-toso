interface SectionHeadingProps {
  id: string;
  eyebrow: string;
  title: string;
}

export function SectionHeading({ id, eyebrow, title }: SectionHeadingProps) {
  return (
    <div className="mb-10 sm:mb-12">
      <p className="mb-2 font-mono text-xs uppercase tracking-[0.15em] text-muted">{eyebrow}</p>
      <h2 id={id} className="font-display text-2xl font-semibold tracking-tight text-text sm:text-3xl">
        {title}
      </h2>
    </div>
  );
}
