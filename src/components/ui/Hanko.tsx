interface HankoProps {
  size?: number;
  className?: string;
}

export function Hanko({ size = 40, className = "" }: HankoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden="true"
      className={`shrink-0 bg-warm text-[var(--bg)] ${className}`}
    >
      <rect x="2" y="2" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 12 L28 28 M28 12 L12 28 M20 8 V32"
        stroke="currentColor"
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
