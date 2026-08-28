"use client";

import { useLayoutEffect, useRef } from "react";

function resize(el) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

export default function AutoGrowTextarea({
  className = "w-full border p-2",
  onChange,
  style,
  rows = 1,
  ...props
}) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    resize(el);

    let lastWidth = el.offsetWidth;
    const observer = new ResizeObserver(() => {
      const width = el.offsetWidth;
      if (width === lastWidth) return;
      lastWidth = width;
      resize(el);
    });
    observer.observe(el);

    return () => observer.disconnect();
  }, [props.value]);

  const handleChange = (e) => {
    resize(e.target);
    onChange?.(e);
  };

  return (
    <textarea
      {...props}
      ref={ref}
      className={className}
      onChange={handleChange}
      rows={rows}
      style={{ overflow: "hidden", resize: "none", ...style }}
    />
  );
}
