"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const TOOLTIP_WIDTH = 256; // matches w-64
const GAP = 8;

const NarrowTooltip = ({ tooltipText }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [placement, setPlacement] = useState("top");

  const iconRef = useRef(null);
  const tooltipRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!showTooltip || !iconRef.current || !mounted) return;

    const updatePosition = () => {
      const iconRect = iconRef.current.getBoundingClientRect();
      const tooltipHeight = tooltipRef.current?.offsetHeight || 120;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Horizontal centering with viewport clamping
      let left = iconRect.left + iconRect.width / 2 - TOOLTIP_WIDTH / 2;
      left = Math.max(8, Math.min(left, viewportWidth - TOOLTIP_WIDTH - 8));

      // Prefer above, but flip below if there isn't enough room
      const spaceAbove = iconRect.top;
      const spaceBelow = viewportHeight - iconRect.bottom;

      let nextPlacement = "top";
      let top = iconRect.top - tooltipHeight - GAP;

      if (
        spaceAbove < tooltipHeight + GAP &&
        spaceBelow >= tooltipHeight + GAP
      ) {
        nextPlacement = "bottom";
        top = iconRect.bottom + GAP;
      }

      // Final clamp so it never gets cut by viewport top/bottom
      top = Math.max(8, Math.min(top, viewportHeight - tooltipHeight - 8));

      setPlacement(nextPlacement);
      setCoords({ top, left });
    };

    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [showTooltip, mounted]);

  return (
    <>
      <div className="inline-flex">
        <div
          ref={iconRef}
          className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 text-gray-700 text-xs font-bold cursor-help select-none"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          aria-label={tooltipText}
        >
          i
        </div>
      </div>

      {mounted &&
        showTooltip &&
        createPortal(
          <div
            ref={tooltipRef}
            className="fixed z-[99999] w-64 p-2 text-sm text-white bg-[#11999e] border-2 border-black rounded-md shadow-lg text-start whitespace-pre-wrap font-semibold"
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
            }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            {tooltipText}
          </div>,
          document.body,
        )}
    </>
  );
};

export default NarrowTooltip;
