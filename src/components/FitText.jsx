import { useLayoutEffect, useRef, useState } from 'react';

// Card text that takes whatever height the card has left and shows only the
// whole lines that fit, ending in an ellipsis, so no line is ever cut in half.
export function FitText({ className, children }) {
  const box = useRef(null);
  const text = useRef(null);
  const [lines, setLines] = useState(3);

  useLayoutEffect(() => {
    const fit = () => {
      if (!box.current || !text.current) return;
      const lineHeight = parseFloat(getComputedStyle(text.current).lineHeight) || 21;
      setLines(Math.floor((box.current.clientHeight + 1) / lineHeight));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box.current);
    return () => observer.disconnect();
  }, []);

  return (
    <span className="fit-text" ref={box}>
      <span ref={text} className={className} style={{ WebkitLineClamp: Math.max(lines, 1), visibility: lines < 1 ? 'hidden' : undefined }}>{children}</span>
    </span>
  );
}
