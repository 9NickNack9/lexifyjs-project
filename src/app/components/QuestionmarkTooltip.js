"use client";

import React, { useState } from "react";

const QuestionMarkTooltip = ({ tooltipText }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  /* <QuestionMarkTooltip tooltipText=""/>*/
  return (
    <div className="relative inline-block">
      <div
        className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 text-gray-700 text-xs font-bold cursor-help"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label={tooltipText}
      >
        i
      </div>

      {showTooltip && (
        <div className="absolute z-10 w-64 p-2 text-sm text-white bg-[#11999e] border-2 border-black rounded-md shadow-lg bottom-full mb-2 -left-1/2 transform -translate-x-1/4 font-semibold">
          {tooltipText}
        </div>
      )}
    </div>
  );
};

export default QuestionMarkTooltip;
