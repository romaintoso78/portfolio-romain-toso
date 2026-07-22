interface TagProps {
  children: string;
  note?: string;
}

export function Tag({ children, note }: TagProps) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded border border-border bg-surface-2 px-2.5 py-1 font-mono text-xs text-muted">
      {children}
      {note && <span className="text-accent">· {note}</span>}
    </span>
  );
}
