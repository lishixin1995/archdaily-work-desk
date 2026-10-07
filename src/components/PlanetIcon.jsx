import { useId } from 'react';

// Theme hues a planet can take: [highlight, body, shadow]. A site always gets
// the same hue, so its planet is recognisable from one visit to the next.
const HUES = [
  ['#f1e9ff', '#b79cff', '#3a2470'],
  ['#e2f7ff', '#6fd6ff', '#173f66'],
  ['#fff3d6', '#f2c46a', '#6b4214'],
  ['#e3fff3', '#8fe3c0', '#174d40'],
  ['#ffe6f2', '#f29ac4', '#5e1d45'],
  ['#ffeadf', '#ff9a76', '#662a1a']
];

function hueFor(seed) {
  let hash = 0;
  for (const char of String(seed || '')) hash = (hash * 31 + char.codePointAt(0)) >>> 0;
  return HUES[hash % HUES.length];
}

// A small ringed planet with a moon and a spark, used when a site has no icon.
export function PlanetIcon({ seed, size = 44 }) {
  const id = `planet${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [light, body, shadow] = hueFor(seed);
  return (
    <svg className="planet-icon" width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`${id}-body`} cx="34%" cy="30%" r="78%">
          <stop offset="0" stopColor={light} />
          <stop offset="0.42" stopColor={body} />
          <stop offset="1" stopColor={shadow} />
        </radialGradient>
        <radialGradient id={`${id}-halo`}>
          <stop offset="0.55" stopColor={body} stopOpacity="0.32" />
          <stop offset="1" stopColor={body} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-ring`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={body} stopOpacity="0.1" />
          <stop offset="0.5" stopColor={light} stopOpacity="0.95" />
          <stop offset="1" stopColor={body} stopOpacity="0.1" />
        </linearGradient>
        <clipPath id={`${id}-clip`}><circle cx="24" cy="25" r="11" /></clipPath>
      </defs>
      <circle cx="24" cy="25" r="19" fill={`url(#${id}-halo)`} />
      <g transform="rotate(-20 24 25)">
        <path d="M5 25 A19 5.4 0 0 1 43 25" fill="none" stroke={`url(#${id}-ring)`} strokeWidth="1.4" opacity="0.55" />
      </g>
      <circle cx="24" cy="25" r="11" fill={`url(#${id}-body)`} />
      <g clipPath={`url(#${id}-clip)`} opacity="0.35">
        <path d="M11 22.5 Q24 19 37 22.5" fill="none" stroke={light} strokeWidth="1.1" />
        <path d="M11 28.5 Q24 25.5 37 28.5" fill="none" stroke={shadow} strokeWidth="1.6" />
      </g>
      <circle cx="24" cy="25" r="10.6" fill="none" stroke={light} strokeOpacity="0.28" strokeWidth="0.7" />
      <g transform="rotate(-20 24 25)">
        <path d="M43 25 A19 5.4 0 0 1 5 25" fill="none" stroke={`url(#${id}-ring)`} strokeWidth="1.9" strokeLinecap="round" />
      </g>
      <circle cx="39" cy="10.5" r="2.1" fill={light} />
      <circle cx="39" cy="10.5" r="3.6" fill={light} opacity="0.16" />
      <path d="M10.5 7.5 L11.3 9.7 L13.5 10.5 L11.3 11.3 L10.5 13.5 L9.7 11.3 L7.5 10.5 L9.7 9.7 Z" fill="#f2edff" opacity="0.85" />
    </svg>
  );
}
