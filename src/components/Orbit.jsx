import { useEffect, useRef } from 'react';
import { getHighlight, onHighlight, setHighlight } from '../lib/highlight.js';
import { daysLeft, dueText, isOverdue, kindLabel, LEVEL, tokenFor } from '../lib/tasks.js';

const COLOR_TOKENS = ['--danger', '--done', '--accent', '--accent-bright', '--text', '--muted', '--line', '--line-strong', '--lv-urgent', '--lv-high', '--lv-progress', '--lv-normal', '--lv-waiting', '--lv-low'];
const TWO_PI = Math.PI * 2;

function hexA(hex, alpha) {
  let value = String(hex || '#ffffff').replace('#', '').trim();
  if (value.length === 3) value = value.split('').map((c) => c + c).join('');
  const n = parseInt(value, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

// Ring radii as a share of R: overdue zone 0.2, today 0.32, +7 days 0.66, +30 days 1.
function radiusFor(item) {
  const d = daysLeft(item);
  if (d < 0) return Math.max(0.12, 0.2 + d * 0.02);
  if (d === 0) return 0.32;
  if (d <= 7) return 0.32 + 0.34 * (d / 7);
  if (d <= 30) return 0.66 + 0.34 * ((d - 7) / 23);
  return 1.06;
}

const easeOutBack = (k) => 1 + 2.2 * (k - 1) ** 3 + 1.2 * (k - 1) ** 2;

// Each item is a star; the closer to the sun, the sooner it is due.
export function Orbit({ items, flashId, onSelect }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const tipRef = useRef(null);
  const api = useRef(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const tip = tipRef.current;
    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now();
    const styles = getComputedStyle(document.documentElement);
    const colors = Object.fromEntries(COLOR_TOKENS.map((token) => [token, styles.getPropertyValue(token).trim()]));
    let W = 0;
    let H = 0;
    let cx = 0;
    let cy = 0;
    let R = 0;
    let tilt = 0.42;
    let field = [];
    let stars = new Map();
    let points = [];
    let hovered = null;
    let running = false;

    function sync(list, flash) {
      const next = new Map();
      for (const item of list) {
        const d = daysLeft(item);
        if ((item.done && d < 0) || d > 45) continue;
        const old = stars.get(item.id);
        const rf = radiusFor(item);
        next.set(item.id, {
          item,
          rf,
          theta: old ? old.theta : hash(item.id + item.title) * TWO_PI,
          omega: (TWO_PI / 90000) * (0.32 / rf),
          born: old ? old.born : (flash === item.id && !reduced ? performance.now() : 0)
        });
      }
      stars = next;
      redraw();
    }

    function resize() {
      const rect = wrap.getBoundingClientRect();
      W = rect.width;
      H = rect.height;
      if (!W || !H) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const small = W < 560;
      const reach = W * (small ? 0.45 : 0.4);
      // On squarer screens the orbit runs out of width first, so the plane tips
      // toward the viewer and the rings fill the spare height too.
      tilt = Math.min(small ? 0.72 : 0.56, Math.max(small ? 0.5 : 0.42, (H * 0.34) / reach));
      cx = W * (small ? 0.5 : 0.56);
      cy = H * (small ? 0.58 : 0.56);
      R = Math.min(reach, (H * 0.34) / tilt);
      const count = Math.max(60, Math.min(420, Math.round((W * H) / 2600)));
      field = Array.from({ length: count }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.35 + Math.random() * 0.9,
        a: 0.15 + Math.random() * 0.55,
        tw: 0.0006 + Math.random() * 0.0016,
        ph: Math.random() * TWO_PI
      }));
      redraw();
    }

    function ring(rf, stroke, dash) {
      ctx.save();
      ctx.setLineDash(dash || []);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(cx, cy, R * rf, R * rf * tilt, 0, 0, TWO_PI);
      ctx.stroke();
      ctx.restore();
    }

    function drawStar(point, now) {
      const { item } = point.star;
      const lit = getHighlight();
      const isLit = lit.has(item.id) || hovered === item.id;
      const waiting = item.level === 'waiting' && !item.done;
      let alpha = 0.6 + 0.4 * ((point.depth + 1) / 2);
      if (lit.size && !isLit) alpha *= 0.22;
      if (item.done) alpha *= 0.6;
      let size = point.size;
      if (point.star.born) {
        const k = Math.min(1, (now - point.star.born) / 700);
        size *= Math.max(0, easeOutBack(k));
        if (k >= 1) point.star.born = 0;
      }
      const color = colors[tokenFor(item)] || colors['--lv-normal'];
      ctx.globalAlpha = alpha;
      if (!item.done) {
        const glow = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, size * 5.5);
        glow.addColorStop(0, hexA(color, waiting ? 0.22 : 0.5));
        glow.addColorStop(1, hexA(color, 0));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(point.x, point.y, size * 5.5, 0, TWO_PI);
        ctx.fill();
      }
      if (waiting) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(point.x, point.y, size, 0, TWO_PI);
        ctx.stroke();
      } else {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(point.x, point.y, size, 0, TWO_PI);
        ctx.fill();
        if (!item.done) {
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.beginPath();
          ctx.arc(point.x, point.y, size * 0.42, 0, TWO_PI);
          ctx.fill();
        }
      }
      if (item.level === 'urgent' && !item.done) {
        ctx.strokeStyle = hexA(color, 0.7);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(point.x - size * 3.2, point.y);
        ctx.lineTo(point.x + size * 3.2, point.y);
        ctx.moveTo(point.x, point.y - size * 3.2);
        ctx.lineTo(point.x, point.y + size * 3.2);
        ctx.stroke();
      }
      if (isOverdue(item)) {
        const pulse = reduced ? 0.5 : (Math.sin(now / 380) + 1) / 2;
        ctx.strokeStyle = hexA(colors['--danger'], 0.5 + 0.45 * pulse);
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.arc(point.x, point.y, size + 4 + pulse * 1.5, 0, TWO_PI);
        ctx.stroke();
      }
      if (isLit) {
        ctx.strokeStyle = hexA(colors['--accent-bright'], 0.9);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(point.x, point.y, size + 9, 0, TWO_PI);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    function drawSun(elapsed) {
      const pulse = reduced ? 1 : 1 + 0.035 * Math.sin(elapsed / 1300);
      const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.5);
      halo.addColorStop(0, hexA(colors['--lv-normal'], 0.12));
      halo.addColorStop(1, hexA(colors['--lv-normal'], 0));
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.5, 0, TWO_PI);
      ctx.fill();
      const radius = R * 0.15 * pulse;
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      core.addColorStop(0, 'rgba(255,248,253,1)');
      core.addColorStop(0.16, hexA(colors['--accent-bright'], 0.95));
      core.addColorStop(0.42, hexA(colors['--accent'], 0.3));
      core.addColorStop(1, hexA(colors['--accent'], 0));
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, TWO_PI);
      ctx.fill();
    }

    function placeTip(point) {
      const dir = point.x > W - 260 ? -1 : 1;
      const offset = (point.size + 9) * 0.7;
      const ax = point.x + dir * 24;
      const ay = point.y - 24;
      ctx.strokeStyle = hexA(colors['--accent-bright'], 0.55);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(point.x + dir * offset, point.y - offset);
      ctx.lineTo(ax, ay);
      ctx.lineTo(ax + dir * 14, ay);
      ctx.stroke();
      const left = Math.max(0, Math.min(W - tip.offsetWidth, dir > 0 ? ax + 18 : ax - 18 - tip.offsetWidth));
      const top = Math.max(4, Math.min(H - tip.offsetHeight - 4, ay - tip.offsetHeight / 2));
      tip.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
    }

    function draw(now = performance.now()) {
      if (!W || !H) return;
      const elapsed = reduced ? 0 : now - start;
      ctx.clearRect(0, 0, W, H);
      for (const star of field) {
        const alpha = reduced ? star.a : star.a * (0.65 + 0.35 * Math.sin(elapsed * star.tw + star.ph));
        ctx.fillStyle = hexA(colors['--text'], alpha);
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, TWO_PI);
        ctx.fill();
      }
      ring(0.2, hexA(colors['--danger'], 0.35), [3, 4]);
      ring(0.32, hexA(colors['--accent'], 0.55));
      ring(0.66, colors['--line-strong']);
      ring(1, colors['--line']);
      ctx.font = '500 10px "JetBrains Mono", ui-monospace, monospace';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '1.5px';
      ctx.textAlign = 'center';
      ctx.fillStyle = colors['--muted'];
      [[0.32, 'TODAY'], [0.66, '+7 DAYS'], [1, '+30 DAYS']].forEach(([rf, label]) => ctx.fillText(label, cx, cy + R * rf * tilt + 15));
      points = [];
      for (const star of stars.values()) {
        const theta = star.theta + star.omega * elapsed;
        const r = R * star.rf;
        const depth = Math.sin(theta);
        points.push({ star, x: cx + r * Math.cos(theta), y: cy + r * tilt * depth, depth, size: (LEVEL[star.item.level]?.size || 2.9) * (0.85 + 0.15 * depth) });
      }
      points.sort((a, b) => a.depth - b.depth);
      for (const point of points) if (point.depth < 0) drawStar(point, now);
      drawSun(elapsed);
      for (const point of points) if (point.depth >= 0) drawStar(point, now);
      if (hovered) {
        const point = points.find((p) => p.star.item.id === hovered);
        if (point) placeTip(point);
      }
    }

    function frame(now) {
      if (!running) return;
      draw(now);
      requestAnimationFrame(frame);
    }

    function setRunning(on) {
      const next = on && !reduced;
      if (next === running) return;
      running = next;
      if (running) requestAnimationFrame(frame);
    }

    function redraw() {
      if (!running) draw();
    }

    function hit(event) {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      let best = null;
      let bestDistance = Infinity;
      for (const point of points) {
        const distance = Math.hypot(point.x - x, point.y - y);
        if (distance < Math.max(14, point.size + 9) && distance < bestDistance) {
          best = point;
          bestDistance = distance;
        }
      }
      return best;
    }

    function hover(point) {
      const id = point ? point.star.item.id : null;
      if (id === hovered) return;
      hovered = id;
      canvas.style.cursor = id ? 'pointer' : 'default';
      if (point) {
        const { item } = point.star;
        tip.querySelector('.tip-title').textContent = item.title;
        const meta = tip.querySelector('.tip-meta');
        meta.textContent = [item.project, kindLabel(item), dueText(item)].filter(Boolean).join(' · ');
        meta.classList.toggle('is-overdue', isOverdue(item));
        tip.hidden = false;
      } else {
        tip.hidden = true;
      }
      setHighlight(id ? [id] : []);
      redraw();
    }

    const onMove = (event) => { if (event.pointerType !== 'touch') hover(hit(event)); };
    const onLeave = () => hover(null);
    const onClick = (event) => {
      const point = hit(event);
      if (!point) return;
      hover(point);
      const rect = canvas.getBoundingClientRect();
      const x = rect.left + point.x;
      const y = rect.top + point.y;
      api.current.onSelect?.(point.star.item, { left: x - 10, right: x + 10, top: y - 10, bottom: y + 10, width: 20, height: 20 }, event.pointerType === 'touch');
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('click', onClick);

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(wrap);
    const visibility = new IntersectionObserver(([entry]) => setRunning(entry.isIntersecting));
    visibility.observe(wrap);
    const offHighlight = onHighlight(() => redraw());
    document.fonts?.ready?.then(() => redraw());

    api.current = { ...(api.current || {}), sync };
    sync(api.current.items || [], api.current.flashId);

    return () => {
      running = false;
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('click', onClick);
      resizeObserver.disconnect();
      visibility.disconnect();
      offHighlight();
    };
  }, []);

  useEffect(() => {
    api.current = { ...(api.current || {}), items, flashId, onSelect };
    api.current.sync?.(items, flashId);
  }, [items, flashId, onSelect]);

  return (
    <div className="orbit-canvas" ref={wrapRef}>
      <canvas ref={canvasRef} role="img" aria-label="Orbit map: each task is a star; the closer it is to the center, the sooner it is due. Today's tasks on the right list the same tasks." />
      <div className="orbit-tip" ref={tipRef} hidden><span className="tip-title" /><span className="tip-meta" /></div>
    </div>
  );
}
