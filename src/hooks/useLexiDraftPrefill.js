"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { consumeLexiDraft } from "@/lib/lexiDraft";

export const LEXI_APPLY_DRAFT_EVENT = "lexify-apply-lexi-draft";

export default function useLexiDraftPrefill(setFormData) {
  const pathname = usePathname();

  useEffect(() => {
    const applyDraft = () => {
      const draftData = consumeLexiDraft(pathname);
      if (!draftData) return;

      setFormData((prev) => ({
        ...prev,
        ...draftData,
        backgroundFiles: prev.backgroundFiles ?? [],
        supplierFiles: prev.supplierFiles ?? [],
        agree: false,
      }));
    };

    applyDraft();
    window.addEventListener(LEXI_APPLY_DRAFT_EVENT, applyDraft);
    return () => window.removeEventListener(LEXI_APPLY_DRAFT_EVENT, applyDraft);
  }, [pathname, setFormData]);
}
