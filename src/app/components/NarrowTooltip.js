"use client";

import React, { useState, useRef, useEffect } from "react";

const NarrowTooltip = ({ tooltipText }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [position, setPosition] = useState("center");
  const iconRef = useRef(null);

  useEffect(() => {
    if (showTooltip && iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      const windowWidth = window.innerWidth;

      if (rect.left < 150) {
        setPosition("left");
      } else if (windowWidth - rect.right < 150) {
        setPosition("right");
      } else {
        setPosition("center");
      }
    }
  }, [showTooltip]);

  const getTooltipPositionClass = () => {
    switch (position) {
      case "left":
        return "left-0";
      case "right":
        return "right-0";
      case "center":
      default:
        return "left-1/2 transform -translate-x-1/2";
    }
  };

  return (
    <div className="relative inline-block">
      <div
        ref={iconRef}
        className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 text-gray-700 text-xs font-bold cursor-help"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label={tooltipText}
      >
        i
      </div>

      {showTooltip && (
        <div
          className={`absolute z-10 w-64 p-2 text-sm text-white bg-[#11999e] border-2 border-black rounded-md shadow-lg bottom-full mb-2 ${getTooltipPositionClass()} text-start whitespace-pre-wrap font-semibold`}
        >
          {tooltipText}
        </div>
      )}
    </div>
  );
};

export default NarrowTooltip;
