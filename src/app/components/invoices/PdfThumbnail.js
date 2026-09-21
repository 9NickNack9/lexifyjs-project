"use client";

import { useEffect, useRef, useState } from "react";
import { FileText } from "lucide-react";

export default function PdfThumbnail({ url }) {
  const canvasRef = useRef(null);
  const [failed, setFailed] = useState(!url);

  useEffect(() => {
    if (!url) {
      setFailed(true);
      return undefined;
    }

    let cancelled = false;
    setFailed(false);

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf.worker.min.mjs`;

        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch PDF");
        const data = new Uint8Array(await response.arrayBuffer());
        if (cancelled) return;

        const pdf = await pdfjs.getDocument({ data }).promise;
        if (cancelled) return;

        const page = await pdf.getPage(1);
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;

        const base = page.getViewport({ scale: 1 });
        const cssWidth = Math.max(
          canvas.parentElement?.clientWidth || 192,
          160,
        );
        const viewport = page.getViewport({
          scale: (cssWidth * (window.devicePixelRatio || 1)) / base.width,
        });

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvas,
          viewport,
        }).promise;
      } catch (error) {
        console.error("PDF thumbnail failed:", error);
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (failed) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400">
        <FileText className="h-8 w-8" />
      </div>
    );
  }

  return (
    <canvas ref={canvasRef} className="block h-auto w-full" aria-hidden="true" />
  );
}
