import { moonLit, moonName, moonPhase, moonShape } from '../lib/moon.js';

export function Moon({ date, size = 14, className = 'moon' }) {
  const shape = moonShape(moonPhase(date), size);
  return (
    <svg className={className} width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle className="moon-dark" cx={shape.c} cy={shape.c} r={shape.r} />
      {shape.full ? <circle className="moon-lit" cx={shape.c} cy={shape.c} r={shape.r} /> : null}
      {shape.path ? <path className="moon-lit" d={shape.path} /> : null}
    </svg>
  );
}

export function MoonLine({ date }) {
  const phase = moonPhase(date);
  return (
    <p className="moon-line">
      <Moon date={date} size={18} />
      <span>{moonName(phase)} · {Math.round(moonLit(phase) * 100)}% lit</span>
    </p>
  );
}
