"use client";

import { useEffect, useRef } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";

export default function VideoPlayer({
  src,
  poster,
  title = "Video tutorial",
  className = "",
}) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create the <video> element imperatively (best practice for Video.js + modals)
    const videoEl = document.createElement("video");
    videoEl.className = "video-js vjs-big-play-centered vjs-default-skin";
    videoEl.setAttribute("playsinline", "true");

    // Native fallback (if Video.js UI/CSS fails you still see a player)
    videoEl.controls = true;
    if (poster) videoEl.poster = poster;

    container.appendChild(videoEl);

    // Init Video.js
    const player = (playerRef.current = videojs(videoEl, {
      controls: true,
      responsive: true,
      fluid: true,
      aspectRatio: "16:9",
      preload: "auto",
      sources: [{ src, type: "video/mp4" }],
      poster,
    }));

    return () => {
      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
      // Clean up the DOM node we created
      if (videoEl.parentNode) videoEl.parentNode.removeChild(videoEl);
    };
  }, [src, poster]);

  return (
    <div className={className}>
      {title ? <p className="mb-2 font-semibold">{title}</p> : null}

      {/* Give the modal a guaranteed visible box */}
      <div ref={containerRef} className="w-full min-h-[280px]" />
    </div>
  );
}
