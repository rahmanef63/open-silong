/** Open Silong brand mark — the connected-nodes glyph (same geometry as
 *  `public/logo-mark-*.svg` and the favicon), drawn in `currentColor` so it
 *  adapts to the surrounding text colour / theme. Layout only via `className`
 *  (size it with `size-*`); colour comes from the parent's text colour. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="20 7 64 72" className={className} fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth={7} strokeLinecap="round">
        <line x1="63" y1="20" x2="33" y2="27" />
        <line x1="33" y1="27" x2="52" y2="42" />
        <line x1="52" y1="42" x2="72" y2="47" />
        <line x1="52" y1="42" x2="33" y2="63" />
        <line x1="72" y1="47" x2="63" y2="67" />
        <line x1="33" y1="63" x2="63" y2="67" />
      </g>
      <g fill="currentColor">
        <circle cx="63" cy="20" r="8.5" />
        <circle cx="33" cy="27" r="7.7" />
        <circle cx="52" cy="42" r="8" />
        <circle cx="72" cy="47" r="7.2" />
        <circle cx="33" cy="63" r="8.5" />
        <circle cx="63" cy="67" r="8" />
      </g>
    </svg>
  );
}
