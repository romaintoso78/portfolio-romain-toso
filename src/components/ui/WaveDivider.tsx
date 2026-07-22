import { useId } from "react";

export function WaveDivider() {
  const id = `seigaiha-${useId()}`;

  return (
    <div aria-hidden="true" className="mx-auto max-w-5xl px-5 text-accent/35 sm:px-8">
      <svg width="100%" height="24" preserveAspectRatio="none">
        <defs>
          <pattern id={id} width="34" height="17" patternUnits="userSpaceOnUse">
            <path d="M0 17 A17 17 0 0 1 34 17" fill="none" stroke="currentColor" strokeWidth="1" />
            <path d="M-8.5 17 A17 17 0 0 1 8.5 17" fill="none" stroke="currentColor" strokeWidth="1" />
            <path d="M25.5 17 A17 17 0 0 1 42.5 17" fill="none" stroke="currentColor" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="17" fill={`url(#${id})`} />
      </svg>
    </div>
  );
}
